import { Injectable, Logger } from '@nestjs/common';

/**
 * Product-to-model photography: takes a listing photo of a dress and returns a
 * photo of a person wearing it.
 *
 * Provider is FASHN's own API (api.fashn.ai), called over plain REST with
 * `fetch` — two endpoints don't justify pulling in a client library.
 *
 * WHY product-to-model AND NOT VIRTUAL TRY-ON: try-on endpoints are two-input
 * (a garment plus a photo of the person to dress it on), which meant keeping a
 * fixed model photo around and every listing coming back on the same body.
 * `product-to-model` is single-input — it generates the person as well as the
 * photo — so a dress photo, a short prompt, a seed and a backdrop reference are
 * the whole request. For tighter control the endpoint also takes
 * `face_reference`, which is not wired up.
 *
 * EVERYTHING PROVIDER-SPECIFIC LIVES IN THIS FILE. The controller and the
 * admin UI only ever see
 * `generateModelPhoto(garmentImageUrl, dressId) -> url`, so swapping FASHN for
 * another provider is a one-file change. Keep it that way: no FASHN-shaped
 * types leak out of this module. `dressId` is passed in rather than derived
 * because it is the seed of the per-dress art direction (see directionFor);
 * it is an opaque string to this file, not a database concern.
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
 *                     Optional override of the whole prompt. Setting it REPLACES
 *                     the per-dress pose rotation with one fixed string for
 *                     every generation — see the note on POSE_VARIATIONS.
 *                     Normally unset.
 *   FASHN_BACKGROUND_REFERENCE_URL
 *                     Optional override of the shared backdrop image. Set it to
 *                     the literal "off" to stop sending `background_reference`
 *                     at all. Unset derives the URL from R2_PUBLIC_BASE_URL —
 *                     see STUDIO_BACKGROUND_KEY.
 */

const API_ORIGIN = 'https://api.fashn.ai/v1';
const DEFAULT_MODEL = 'product-to-model';

/**
 * The pose rotation. One short directive per entry, picked by dress id.
 *
 * WHY SHORT. FASHN documents `prompt` as "additional styling instructions" and
 * its own examples are three or four words — "man with tattoos", "tucked-in",
 * "studio background". Against a field designed for directives, a paragraph
 * works against itself: the instructions that matter get averaged in with the
 * ones that are already the model's default behaviour. Every phrase below
 * earns its place or it goes.
 *
 * WHY THE BACKDROP AND LIGHTING ARE NO LONGER DESCRIBED HERE. The backdrop is
 * an image now (see STUDIO_BACKGROUND_KEY) — a reference image pins a tone far
 * harder than a hex code in a sentence, which the model is free to interpret.
 * The old string spent three of its seven clauses describing a cream backdrop
 * with no seam and no floor line; that is now a 1600x2000 PNG that simply is
 * those things.
 *
 * WHY POSE VARIES AT ALL. A straight-on symmetrical stance reads as a
 * mannequin shot and flattens how a dress hangs. Consistency across the
 * catalog is supplied by the shared backdrop, the fixed lighting phrase and
 * the fixed framing — which is where consistency actually matters — so pose is
 * the one axis left free.
 *
 * ORDER AND CONTENT ARE PART OF THE DATA. The index is chosen by hashing the
 * dress id (see directionFor), so inserting or reordering entries reassigns
 * poses for dresses that already have generated photos. Append, don't splice,
 * unless a wholesale reshuffle is what you want.
 */
const POSE_VARIATIONS = [
  'weight on one leg, slight turn, hand on hip',
  'three-quarter angle, relaxed shoulders, soft gaze',
  'one foot stepped forward, arms relaxed',
  'weight back, torso turned in, hands clasped at waist',
  'slight angle, hand grazing fabric at hip',
] as const;

/**
 * Appended to every pose. The two things that must NOT vary between dresses:
 * house style and lighting. Kept to two phrases for the reason above.
 *
 * 'full body' IS LOAD-BEARING — DO NOT DROP IT TO SAVE TWO WORDS. Leaving
 * crop unsaid lets the endpoint vary framing between runs, and a grid of
 * cards where some models are shown to the ankle and others to the waist
 * reads as broken. That is the exact class of inconsistency this file exists
 * to remove, so framing stays pinned even though everything else here is
 * kept short.
 *
 * Two other things push the same way but are not sufficient on their own:
 * `aspect_ratio` is inherited from the source product image (fixing the
 * frame's proportions, not what fills it), and the pose directives are
 * themselves full-body descriptions — "one foot stepped forward" has nowhere
 * to go in a crop above the knee. Both make the right crop likely; the phrase
 * makes it asked for.
 */
const PROMPT_STYLE_SUFFIX =
  'full body with face, editorial studio photography. ' +
  'backdrop color: warm champagne cream (~#E8DCC8, not white, not gray), soft warm lighting ~3000K. ' +
  'replace the face entirely with a different model';

/**
 * Object key of the shared backdrop inside the R2 bucket, resolved against
 * R2_PUBLIC_BASE_URL (the same public origin StorageService writes listing
 * photos to — see storage.service.ts).
 *
 * The asset is a flat 1600x2000 cream gradient, #F7F0E6 → #EFE2D2, no props,
 * no floor line, no seam. Deliberately warmer than the site's own #FAF6F1
 * token: that value is a UI surface and reads as plain white when stretched
 * across a full frame — see the header of scripts/make-studio-backdrop.py.
 * Retune it by looking at generated photos, not to match the site chrome.
 * It is passed as `background_reference` on every
 * generation so the backdrop is literally the same pixels every time instead
 * of the model's fresh interpretation of the words "cream studio backdrop".
 * Backdrop drift between cards was the most visible inconsistency in the grid,
 * and it is not a thing prompt wording can fix.
 *
 * Regenerate it with scripts/make-studio-backdrop.py; re-upload under this
 * exact key. FASHN fetches this URL on every generation, so it must stay
 * publicly readable — if it 404s, generations fail with ImageLoadError (see
 * describeRuntimeError, which names this as a likely cause).
 */
// const STUDIO_BACKGROUND_KEY = 'studio/studio-backdrop-cream-1600x2000.png';

/**
 * 32-bit FNV-1a, returned as a uint32.
 *
 * Used for two things that both need to be stable across restarts and deploys:
 * which pose a dress gets, and which diffusion seed it starts from. A
 * non-cryptographic hash is the right tool — the requirement is determinism
 * and a decent spread over a 5-element array, not unpredictability.
 *
 * `Math.imul` does the 32-bit multiply that plain `*` would lose to float64
 * rounding once the product exceeds 2^53; `>>> 0` brings the result back into
 * the unsigned range FASHN's `seed` accepts (0 … 2^32-1).
 */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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
   * The art direction for one dress: which pose, which prompt, which seed.
   *
   * BOTH HALVES MATTER, AND THE SEED IS THE BIGGER ONE. FASHN's `seed`
   * defaults to 42, and the previous version of this file never sent one — so
   * every generation the catalog has ever produced started from byte-identical
   * diffusion noise. Starting noise anchors composition and stance far more
   * strongly than an adjective in the prompt does, which is why asking for
   * varied poses in text alone kept returning the same shot: the prompt was
   * arguing with the seed and losing.
   *
   * DETERMINISTIC, NOT RANDOM. Same dress in, same pose and same seed out,
   * across restarts and deploys. That is deliberate: regenerating a listing's
   * photo after a failure gives back the same composition rather than a
   * lottery ticket, and a result that looks wrong can be reproduced while
   * someone investigates it. `Math.random()` here would have made every
   * complaint about a bad generation unfalsifiable.
   *
   * The seed keys on `${dressId}-${poseIndex}` rather than the id alone so
   * that appending to POSE_VARIATIONS reshuffles the noise too, instead of
   * pairing a new pose directive with noise already committed to the old one.
   *
   * WHY THE SEED KEYS ON THE DRESS AND NOT ON THE INDIVIDUAL PHOTO. A listing
   * can carry up to 3 photos from the publish form and up to 8 after an admin
   * adds more (MAX_IMAGES / MAX_GALLERY), and the admin panel can run 6
   * through here at once — so "several photos of one dress, one batch" is a
   * real case, and every image in that batch gets the same pose and the same
   * seed. That is a deliberate trade, not an oversight:
   *
   *   - Keeping it: the generations for one listing tend to come back on the
   *     same model. Shared starting noise is the only thing pulling that way,
   *     since `face_reference` is not wired up. A gallery showing one dress on
   *     three different women is a worse failure than a repeated stance.
   *   - Changing it: guarantees varied composition within a listing, at the
   *     cost of the above.
   *
   * The failure mode this leaves open is narrow — two *near-identical* source
   * photos yield near-identical generations. Different angles of the same
   * dress already diverge, because `product_image` differs. So the risk is a
   * data-quality edge case, while the identity benefit applies to every
   * multi-photo listing.
   *
   * TO SWITCH: take an `imageId` here and hash `${dressId}-${poseIndex}-${imageId}`
   * for the seed while leaving poseIndex on the dress. Worth doing if listings
   * turn out to carry several similar photos in practice — check with:
   *   SELECT count(*) AS photos, count(DISTINCT "dressId") AS dresses
   *   FROM "DressImage" GROUP BY "dressId" ORDER BY photos DESC;
   */
  private directionFor(dressId: string): {
    prompt: string;
    seed: number;
    poseIndex: number;
  } {
    const poseIndex = hash32(dressId) % POSE_VARIATIONS.length;
    const seed = hash32(`${dressId}-${poseIndex}`);

    /* An override replaces the pose rotation wholesale — one fixed string for
       every dress. Kept because prompt wording is the kind of thing that gets
       tuned by looking at results rather than reasoning in advance, and doing
       that without a deploy is worth a little inconsistency. The seed still
       varies underneath it. Falls back on whitespace, not just on unset: an
       env var accidentally set to "" would otherwise strip all art direction
       and start producing photos in whatever style the model picks. */
    const override = process.env.FASHN_STUDIO_PROMPT?.trim();
    const prompt =
      override || `${POSE_VARIATIONS[poseIndex]}, ${PROMPT_STYLE_SUFFIX}`;

    return { prompt, seed, poseIndex };
  }

  /**
   * Public URL of the shared backdrop, or '' to send no `background_reference`.
   *
   * Empty is a supported state, not a failure: R2_PUBLIC_BASE_URL unset (so
   * there is nowhere to have uploaded it) and an explicit "off" both mean the
   * parameter is omitted and FASHN invents a background as it did before.
   * That degrades the consistency this was added for, but it degrades — it
   * does not break a generation, which is what pointing FASHN at a URL that
   * isn't there would do.
   */
  // private get backgroundReferenceUrl(): string {
  //   const override = process.env.FASHN_BACKGROUND_REFERENCE_URL?.trim();
  //   if (override) {
  //     return override.toLowerCase() === 'off' ? '' : override;
  //   }
  //   const base = (process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  //   return base ? `${base}/${STUDIO_BACKGROUND_KEY}` : '';
  // }

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
   *
   * `dressId` selects the pose and the seed (see directionFor). It is only
   * ever hashed, so any stable opaque string will do.
   */
  async generateModelPhoto(
    garmentImageUrl: string,
    dressId: string,
  ): Promise<string> {
    const predictionId = await this.submit(garmentImageUrl, dressId);
    return this.pollForOutput(predictionId);
  }

  /** Queue the prediction, get back FASHN's id. */
  private async submit(
    garmentImageUrl: string,
    dressId: string,
  ): Promise<string> {
    const { prompt, seed, poseIndex } = this.directionFor(dressId);
    // const backgroundReference = this.backgroundReferenceUrl;

    /* Logged because the two levers that decide what comes back are now
       derived rather than written down, and "why did this dress get that
       pose" is otherwise unanswerable from the outside. */
    // this.logger.log(
    //   `dress ${dressId}: pose ${poseIndex} seed ${seed}` +
    //     `${backgroundReference ? '' : ' (no background_reference)'}`,
    // );

    const res = await this.call(`${API_ORIGIN}/run`, {
      method: 'POST',
      headers: { ...this.authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: this.modelName,
        // Every model parameter goes inside `inputs` — they are not top-level
        // fields on this envelope.
        inputs: {
          product_image: garmentImageUrl,
          // Short pose directive + fixed style/lighting tail — see
          // POSE_VARIATIONS.
          prompt,
          // THE ACTUAL FIX FOR REPEATED POSES. Omitting this let FASHN apply
          // its documented default of 42 to every request in the catalog, so
          // every generation began from identical noise. See directionFor.
          seed,
          // Conditionally spread: an absent/"off" backdrop must omit the key
          // rather than send an empty string, which FASHN would try to fetch
          // and reject as ImageLoadError.
          // ...(backgroundReference
          //   ? { background_reference: backgroundReference }
          //   : {}),
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
          //
          // NEXT LEVER IF LIGHTING IS STILL UNEVEN ACROSS THE GRID. FASHN's
          // three modes at 1k cost 1 / 2 / 3 credits (fast / balanced /
          // quality). `quality` produces more realistic and more detailed
          // output — including more consistent lighting, because it leans less
          // on the source photo's own exposure — at 3x the cost of the current
          // setting and a longer wait, which TIMEOUT_MS above would need
          // raising to absorb. Try `balanced` (2 credits) first: it is the
          // smaller step and may be enough. Change this only after seeing
          // whether the seed + backdrop changes already fixed it, so the
          // credit increase buys something measurable.
          generation_mode: 'balanced',
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
      /* Two candidates now, not one: the listing photo, or the shared backdrop
         at STUDIO_BACKGROUND_KEY. The backdrop is the same URL on every
         request, so if this error is hitting every generation rather than one,
         check that it is uploaded and publicly readable before looking at the
         listing photo. */
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
