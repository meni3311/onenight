import { Injectable, Logger } from '@nestjs/common';

/**
 * Product-to-model photography: takes a listing photo of a dress and returns a
 * photo of a person wearing it.
 *
 * Provider is FASHN's own API (api.fashn.ai), called over plain REST with
 * `fetch` — same reason StorageService talks to Supabase Storage that way.
 *
 * WHY product-to-model AND NOT VIRTUAL TRY-ON: try-on endpoints are two-input
 * (a garment plus a photo of the person to dress it on), which meant keeping a
 * fixed model photo around and every listing coming back on the same body.
 * `product-to-model` is single-input — it generates the person as well as the
 * photo — so a dress photo plus a text prompt is the whole request. Who
 * appears and how the shot is framed is steered entirely by
 * DEFAULT_STUDIO_PROMPT (overridable via FASHN_STUDIO_PROMPT); for tighter
 * control the endpoint also takes `face_reference`, which is not wired up.
 *
 * EVERYTHING PROVIDER-SPECIFIC LIVES IN THIS FILE. The controller and the
 * admin UI only ever see `generateModelPhoto(garmentImageUrl) -> url`, so
 * swapping FASHN for another provider is a one-file change. Keep it that way:
 * no FASHN-shaped types leak out of this module.
 *
 * Env:
 *   FASHN_API_KEY     Key from https://app.fashn.ai/api. Required. Distinct
 *                     from any fal.ai key — this talks to FASHN directly, and
 *                     billing/credits sit on the FASHN account.
 *   FASHN_MODEL_NAME  Optional override of the model, e.g. "tryon-max".
 *                     Defaults to "product-to-model". Only swap it for another
 *                     single-input model; two-input models need a `model_image`
 *                     this service does not send.
 *   FASHN_STUDIO_PROMPT
 *                     Optional override of the art direction sent with every
 *                     generation — model, pose, backdrop, lighting. Defaults to
 *                     DEFAULT_STUDIO_PROMPT below. This is the only styling
 *                     control the service exposes.
 */

const API_ORIGIN = 'https://api.fashn.ai/v1';
const DEFAULT_MODEL = 'product-to-model';

/**
 * Art direction for the generated photo — model, pose, backdrop, and lighting.
 *
 * This is the entire styling mechanism. `product-to-model` also accepts
 * `background_reference` and `image_prompt` (reference images that anchor the
 * scene), and both are deliberately left unwired: a reference image is one
 * more asset to host, keep reachable, and version, and it competes with the
 * text for control of the result. Text-only means the whole look of the
 * catalog is this one string.
 *
 * The cream-white backdrop is specified by hex so generations sit against the
 * same tone as the site's own surfaces rather than a generic studio grey.
 *
 * Subject and framing are still pinned (a woman, full body), because leaving
 * those unsaid lets the endpoint change crop between runs and a grid of cards
 * with inconsistent framing reads as broken. Pose is deliberately *not*
 * pinned: it asks for a natural asymmetric stance — weight on one leg, a
 * slight turn, hands resting rather than held — because a straight-on
 * symmetrical pose reads as a mannequin shot and flattens how a dress hangs.
 * Consistency across the catalog comes from the fixed backdrop, lighting and
 * framing, which is where it actually matters; varying the pose is what makes
 * the results look photographed rather than generated.
 */
const DEFAULT_STUDIO_PROMPT =
  'Full-body professional fashion photograph of a woman wearing the garment, ' +
  'in a natural relaxed pose with her weight shifted onto one leg, body turned ' +
  'at a slight angle to the camera, hands and arms resting naturally rather ' +
  'than held symmetrically. ' +
  'Plain seamless studio backdrop, warm cream-white tone similar to hex #FAF6F1, ' +
  'no visible floor line or seam, no shadows or texture on the background. ' +
  'Soft diffused even studio lighting from the front, no harsh shadows. ' +
  'Photorealistic, high-end e-commerce fashion photography style, ' +
  'sharp focus on garment fabric, texture, and color accuracy.';

/**
 * Total budget for one image: submit + polling.
 *
 * product-to-model at its default settings (1k, auto→fast) typically lands
 * around 10s, so 30s absorbs a short queue. It does NOT cover a long queue or
 * a heavier `resolution`/`generation_mode` — raise this if either changes.
 */
const TIMEOUT_MS = 30_000;

/**
 * Gap between status polls. FASHN allows 50 status calls per 10s; at 6
 * concurrent predictions (its concurrency ceiling, mirrored by the batch cap
 * in AiGenerateDto) this yields ~40 per 10s, comfortably inside the limit.
 * Lower it and a full batch starts tripping 429s.
 */
const POLL_INTERVAL_MS = 1_500;

/** Terminal states, per FASHN's status enum. */
const DONE = 'completed';
const FAILED = 'failed';
const PENDING = ['starting', 'in_queue', 'processing'];

/** Raised for every failure mode; the caller turns it into a per-image error. */
export class AiPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiPhotoError';
  }
}

/** Status-endpoint payload, narrowed to the fields this service reads. */
interface FashnStatus {
  status?: string;
  output?: string[];
  error?: { name?: string; message?: string } | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class AiPhotoService {
  private readonly logger = new Logger(AiPhotoService.name);

  private get apiKey(): string {
    const key = process.env.FASHN_API_KEY;
    if (!key) {
      throw new AiPhotoError(
        'FASHN_API_KEY is not set — cannot generate AI photos',
      );
    }
    return key;
  }

  private get modelName(): string {
    return process.env.FASHN_MODEL_NAME || DEFAULT_MODEL;
  }

  /**
   * Overriding this restyles every future generation with no deploy, which is
   * the point — prompt wording is the kind of thing that gets tuned by looking
   * at results, not by reasoning about it in advance.
   *
   * Falls back to the default on whitespace, not just on unset: an env var
   * accidentally set to "" would otherwise silently strip all art direction
   * and start producing photos in whatever style the model picks.
   */
  private get studioPrompt(): string {
    return process.env.FASHN_STUDIO_PROMPT?.trim() || DEFAULT_STUDIO_PROMPT;
  }

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  /**
   * One garment photo in, one generated photo URL out.
   *
   * Strictly one prediction per invocation — callers that need several run
   * this once per image, and must not exceed FASHN's 6-prediction concurrency
   * ceiling (see AiGenerateDto's cap).
   *
   * The returned URL points at FASHN's CDN and EXPIRES AFTER THREE DAYS — hand
   * it straight to StorageService so the copy that gets persisted is our own.
   */
  async generateModelPhoto(garmentImageUrl: string): Promise<string> {
    const predictionId = await this.submit(garmentImageUrl);
    return this.pollForOutput(predictionId);
  }

  /** Queue the prediction, get back FASHN's id. */
  private async submit(garmentImageUrl: string): Promise<string> {
    const res = await this.call(`${API_ORIGIN}/run`, {
      method: 'POST',
      headers: { ...this.authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: this.modelName,
        // Every model parameter goes inside `inputs` — they are not top-level
        // fields on this envelope.
        inputs: {
          product_image: garmentImageUrl,
          // Art direction. No background_reference / image_prompt is sent —
          // see the note on DEFAULT_STUDIO_PROMPT.
          prompt: this.studioPrompt,
          num_images: 1,
          // jpeg keeps the stored file small; StorageService accepts it
          // directly, so nothing has to transcode.
          output_format: 'jpeg',
          // COST CONTROL — these two pin the price at 1 credit per image, the
          // cheapest cell in FASHN's grid. Both are sent explicitly even
          // though they currently match the defaults, because the default is
          // not a fixed price: leaving generation_mode unset delegates the
          // choice to FASHN, which bills it as 'fast' at 1k but as 'balanced'
          // (2 credits) at 2k or 4k. Stating both severs that coupling, so
          // nobody can raise the bill by touching one of them alone, and a
          // change to FASHN's auto-selection can't silently double it.
          //
          // Raise them together and check the credit table if you ever want
          // sharper output: quality + 4k is 5 credits, 5x this.
          // 1k is ~1MP, already larger than anything the gallery renders.
          generation_mode: 'fast',
          resolution: '1k',
        },
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      id?: string;
      error?: unknown;
    } | null;

    if (!body?.id) {
      throw new AiPhotoError('שירות ה-AI לא החזיר מזהה בקשה');
    }
    return body.id;
  }

  /**
   * Poll until the prediction reaches a terminal state, then return its image.
   *
   * FASHN returns the output on the status response itself, so unlike a
   * submit/status/result provider there is no third call to make.
   *
   * Bounded by TIMEOUT_MS so a stuck prediction can't hold the admin's HTTP
   * request open indefinitely. An abandoned prediction keeps running on
   * FASHN's side after we give up; it stays visible in the API dashboard.
   */
  private async pollForOutput(predictionId: string): Promise<string> {
    const deadline = Date.now() + TIMEOUT_MS;
    const statusUrl = `${API_ORIGIN}/status/${predictionId}`;

    while (Date.now() < deadline) {
      const res = await this.call(statusUrl, { headers: this.authHeader });
      const body = (await res.json().catch(() => null)) as FashnStatus | null;
      const status = body?.status;

      if (status === DONE) {
        const url = body?.output?.[0];
        if (!url) {
          throw new AiPhotoError('שירות ה-AI לא החזיר תמונה');
        }
        return url;
      }

      if (status === FAILED) {
        // A failed prediction consumes no credits, so this is safe to retry.
        // The name is the useful half (ImageLoadError, ContentModerationError,
        // …); it goes to the log, and the admin gets a plain message.
        this.logger.warn(
          `FASHN prediction ${predictionId} failed: ` +
            `${body?.error?.name ?? 'unknown'} — ${body?.error?.message ?? ''}`,
        );
        throw new AiPhotoError(this.describeRuntimeError(body?.error?.name));
      }

      // Unrecognised status means the contract moved; polling on would just
      // burn the timeout.
      if (status && !PENDING.includes(status)) {
        throw new AiPhotoError(`יצירת התמונה נכשלה (${status})`);
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new AiPhotoError('יצירת התמונה ארכה יותר מדי זמן — נסי שוב');
  }

  /**
   * Runtime-error names worth translating for the admin, because they're the
   * ones she can actually act on. Everything else collapses to a generic
   * message — the detail is already in the log.
   */
  private describeRuntimeError(name?: string): string {
    switch (name) {
      case 'ImageLoadError':
        return 'שירות ה-AI לא הצליח לטעון את התמונה — ודאי שהיא נטענת בדפדפן';
      case 'ContentModerationError':
        return 'התמונה נחסמה על ידי מסנן התוכן של שירות ה-AI';
      case 'InputValidationError':
        return 'התמונה לא עומדת בדרישות שירות ה-AI (גודל או יחס מימדים)';
      default:
        return 'יצירת התמונה נכשלה';
    }
  }

  /**
   * `fetch` + uniform error handling for API-level failures — the ones that
   * come back as an HTTP error code before a prediction id exists. Runtime
   * failures are different: those arrive as HTTP 200 with status "failed" and
   * are handled in pollForOutput.
   *
   * Every non-2xx and every transport failure becomes an AiPhotoError, so
   * callers never inspect a Response. Detail goes to the log, not to the
   * admin — error bodies can echo request context.
   */
  private async call(url: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      this.logger.error(`FASHN request failed: ${url}`, err as Error);
      throw new AiPhotoError('לא ניתן להתחבר לשירות ה-AI');
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(
        `FASHN rejected ${url}: ${res.status} ${res.statusText} ${detail}`,
      );
      throw new AiPhotoError(this.describeApiError(res.status, detail));
    }
    return res;
  }

  /**
   * FASHN puts a machine-readable name in the body's `error` field
   * (UnauthorizedAccess, OutOfCredits, …). 429 covers three very different
   * situations, and "you're out of credits" in particular is worth saying
   * plainly rather than telling the admin to try again into a wall.
   */
  private describeApiError(httpStatus: number, body: string): string {
    let name: string | undefined;
    try {
      name = (JSON.parse(body) as { error?: string })?.error;
    } catch {
      /* non-JSON body — fall through to the status-code mapping */
    }

    if (name === 'OutOfCredits') {
      return 'נגמרו הקרדיטים בחשבון ה-AI — יש לטעון מחדש ב-fashn.ai';
    }
    if (name === 'ConcurrencyLimitExceeded') {
      return 'יותר מדי יצירות במקביל — נסי שוב בעוד רגע';
    }
    if (httpStatus === 401 || httpStatus === 403) {
      return 'מפתח ה-API של שירות ה-AI אינו תקין';
    }
    if (httpStatus === 429) {
      return 'שירות ה-AI עמוס כרגע — נסי שוב בעוד רגע';
    }
    return 'יצירת התמונה נכשלה';
  }
}
