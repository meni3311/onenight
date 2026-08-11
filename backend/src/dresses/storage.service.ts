import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Uploads listing photos to Supabase Storage.
 *
 * Talks to the Storage REST API with `fetch` rather than pulling in
 * `@supabase/supabase-js` — the backend needs exactly two calls (upload, build
 * public URL) and adding an SDK for that is not worth the dependency.
 *
 * Requires two env vars beyond the existing DATABASE_URL/DIRECT_URL:
 *   SUPABASE_URL               https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  Settings → API → service_role (SECRET — server
 *                              only, never expose to the browser; it bypasses
 *                              RLS)
 */

const BUCKET = 'dress-images';
const MAX_BYTES = 10 * 1024 * 1024; // keep in step with the bucket's limit
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Minimal shape of a multer file — avoids depending on @types/multer. */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private get baseUrl(): string {
    const url = process.env.SUPABASE_URL;
    if (!url) {
      throw new InternalServerErrorException(
        'SUPABASE_URL is not set — cannot upload images',
      );
    }
    return url.replace(/\/+$/, '');
  }

  private get serviceKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new InternalServerErrorException(
        'SUPABASE_SERVICE_ROLE_KEY is not set — cannot upload images',
      );
    }
    return key;
  }

  /**
   * Stores one image and returns its public URL.
   *
   * `dressId` is only a folder name here: the publish form uploads photos
   * *before* the dress row exists, so callers pass "pending" for new listings
   * and the real id when replacing images on an existing one. The URL is what
   * gets persisted on DressImage, so the folder never needs to be rewritten.
   */
  async uploadDressImage(file: UploadedImage, dressId = 'pending'): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('קובץ ריק');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('הקובץ גדול מ-10MB');
    }
    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('סוג קובץ לא נתמך (JPG, PNG או WEBP בלבד)');
    }

    return this.put(file.buffer, file.mimetype, ext, dressId);
  }

  /**
   * Copies a remote image into our bucket and returns its public URL.
   *
   * Exists for the AI photo flow: FASHN hands back a URL on its own CDN which
   * expires after three days and is outside our control. Persisting a copy is
   * what makes a generated photo a real listing photo like any other — same
   * bucket, same public URL shape, so nothing downstream can tell the
   * difference (the `isAiGenerated` flag on DressImage is what marks it).
   *
   * Validates the fetched bytes against the same MIME/size rules as a user
   * upload, because the bucket enforces them regardless of who is calling.
   */
  async uploadFromUrl(sourceUrl: string, dressId = 'pending'): Promise<string> {
    let res: Response;
    try {
      res = await fetch(sourceUrl);
    } catch (err) {
      this.logger.error(`Could not fetch generated image ${sourceUrl}`, err as Error);
      throw new InternalServerErrorException('שמירת התמונה שנוצרה נכשלה');
    }
    if (!res.ok) {
      this.logger.error(
        `Generated image fetch returned ${res.status} for ${sourceUrl}`,
      );
      throw new InternalServerErrorException('שמירת התמונה שנוצרה נכשלה');
    }

    // Trust the response's declared type, but fall back to jpeg: fal's CDN
    // occasionally serves `application/octet-stream`, and the request asked
    // for jpeg output.
    const declared = (res.headers.get('content-type') || '').split(';')[0].trim();
    const mimetype = ALLOWED_MIME[declared] ? declared : 'image/jpeg';

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) {
      throw new InternalServerErrorException('התמונה שנוצרה ריקה');
    }
    if (buffer.length > MAX_BYTES) {
      throw new InternalServerErrorException('התמונה שנוצרה גדולה מ-10MB');
    }

    return this.put(buffer, mimetype, ALLOWED_MIME[mimetype], dressId);
  }

  /** Shared write path for both upload entry points. */
  private async put(
    buffer: Buffer,
    mimetype: string,
    ext: string,
    dressId: string,
  ): Promise<string> {
    const objectPath = `${dressId}/${randomUUID()}.${ext}`;
    const endpoint = `${this.baseUrl}/storage/v1/object/${BUCKET}/${objectPath}`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceKey}`,
          'Content-Type': mimetype,
          'x-upsert': 'false',
        },
        body: new Uint8Array(buffer),
      });
    } catch (err) {
      this.logger.error(`Storage upload failed for ${objectPath}`, err as Error);
      throw new InternalServerErrorException('העלאת התמונה נכשלה');
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(
        `Storage rejected ${objectPath}: ${res.status} ${res.statusText} ${detail}`,
      );
      // A 404 here almost always means the bucket doesn't exist yet — see
      // supabase/migrations/003_dress_images_bucket.sql.
      throw new InternalServerErrorException('העלאת התמונה נכשלה');
    }

    return `${this.baseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  }
}
