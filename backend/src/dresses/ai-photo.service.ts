import { Injectable, Logger } from '@nestjs/common';

const API_ORIGIN = 'https://api.fashn.ai/v1';
const DEFAULT_MODEL = 'product-to-model';

const POSE_VARIATIONS = [
  'weight on one leg, slight turn, hand on hip',
  'three-quarter angle, relaxed shoulders, soft gaze',
  'one foot stepped forward, arms relaxed',
  'weight back, torso turned in, hands clasped at waist',
  'slight angle, hand grazing fabric at hip',
] as const;

const PROMPT_STYLE_SUFFIX =
  'full body with face, editorial studio photography. ' +
  'backdrop color: warm champagne cream (~#E8DCC8, not white, not gray), soft warm lighting ~3000K. ' +
  'replace the face entirely with a different model';

function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const TIMEOUT_MS = 30_000;

const POLL_INTERVAL_MS = 1_500;

const DONE = 'completed';
const FAILED = 'failed';
const PENDING = ['starting', 'in_queue', 'processing'];

export class AiPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiPhotoError';
  }
}

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

  private directionFor(dressId: string): {
    prompt: string;
    seed: number;
    poseIndex: number;
  } {
    const poseIndex = hash32(dressId) % POSE_VARIATIONS.length;
    const seed = hash32(`${dressId}-${poseIndex}`);

    const override = process.env.FASHN_STUDIO_PROMPT?.trim();
    const prompt =
      override || `${POSE_VARIATIONS[poseIndex]}, ${PROMPT_STYLE_SUFFIX}`;

    return { prompt, seed, poseIndex };
  }

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async generateModelPhoto(
    garmentImageUrl: string,
    dressId: string,
  ): Promise<string> {
    const predictionId = await this.submit(garmentImageUrl, dressId);
    return this.pollForOutput(predictionId);
  }

  private async submit(
    garmentImageUrl: string,
    dressId: string,
  ): Promise<string> {
    const { prompt, seed, poseIndex } = this.directionFor(dressId);

    const res = await this.call(`${API_ORIGIN}/run`, {
      method: 'POST',
      headers: { ...this.authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: this.modelName,
        inputs: {
          product_image: garmentImageUrl,
          prompt,
          seed,
          num_images: 1,
          output_format: 'jpeg',
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
        this.logger.warn(
          `FASHN prediction ${predictionId} failed: ` +
            `${body?.error?.name ?? 'unknown'} — ${body?.error?.message ?? ''}`,
        );
        throw new AiPhotoError(this.describeRuntimeError(body?.error?.name));
      }

      if (status && !PENDING.includes(status)) {
        throw new AiPhotoError(`יצירת התמונה נכשלה (${status})`);
      }

      await sleep(POLL_INTERVAL_MS);
    }

    throw new AiPhotoError('יצירת התמונה ארכה יותר מדי זמן — נסי שוב');
  }

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

  private describeApiError(httpStatus: number, body: string): string {
    let name: string | undefined;
    try {
      name = (JSON.parse(body) as { error?: string })?.error;
    } catch {
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
