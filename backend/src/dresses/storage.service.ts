import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Uploads listing photos to Cloudflare R2.
 *
 * R2 speaks the S3 API, so this uses the AWS SDK rather than a Cloudflare
 * client. Two differences from real S3 are worth knowing:
 *
 *   - the region is always the literal string "auto" (R2 has no regions in the
 *     S3 sense; where the data lives is a bucket-creation setting), and
 *   - the endpoint must be given explicitly, since the SDK would otherwise
 *     build an amazonaws.com hostname.
 *
 * Public URLs do not come from the S3 endpoint. The API endpoint is
 * credential-gated; serving happens on a separate public hostname — either the
 * bucket's r2.dev subdomain or a custom domain — which is why
 * R2_PUBLIC_BASE_URL is configured independently of the account id.
 *
 * Required env vars (beyond DATABASE_URL/DIRECT_URL):
 *   R2_ACCOUNT_ID          Cloudflare account id (R2 → Overview, or the hex
 *                          string in the dashboard URL)
 *   R2_ACCESS_KEY_ID       R2 → Manage API tokens → Object Read & Write
 *   R2_SECRET_ACCESS_KEY   shown once when the token is created (SECRET)
 *   R2_BUCKET              bucket name (defaults to "dress-images")
 *   R2_PUBLIC_BASE_URL     public origin for reads, no trailing slash, e.g.
 *                          https://pub-<hash>.r2.dev or https://img.example.com
 */

const DEFAULT_BUCKET = 'dress-images';
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

  /**
   * Built once and reused. A fresh S3Client per request would mean a fresh
   * connection pool per request, which is the pattern that made the old
   * database setup slow — no reason to repeat it here.
   */
  private client?: S3Client;

  private env(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new InternalServerErrorException(
        `${name} is not set — cannot upload images`,
      );
    }
    return value;
  }

  private get bucket(): string {
    return process.env.R2_BUCKET || DEFAULT_BUCKET;
  }

  /** Public read origin, trailing slash stripped so joins stay predictable. */
  private get publicBaseUrl(): string {
    return this.env('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
  }

  private get s3(): S3Client {
    if (!this.client) {
      const accountId = this.env('R2_ACCOUNT_ID');
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.env('R2_ACCESS_KEY_ID'),
          secretAccessKey: this.env('R2_SECRET_ACCESS_KEY'),
        },
        // The SDK started sending a CRC32 checksum header on every request by
        // default. R2 rejects requests carrying checksum headers it did not
        // ask for, so uploads fail with a signature error that reads like a
        // credentials problem. Sending checksums only where the API requires
        // them keeps R2 happy without weakening anything.
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
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
   * upload, because the bucket's contract is the same regardless of who is
   * calling.
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

  /**
   * Removes the stored object behind a public URL. Best-effort by design.
   *
   * BEST-EFFORT IS DELIBERATE: callers delete the database row too, and the
   * row is the source of truth for what a listing shows. If the bucket
   * delete fails, the worst outcome is an unreferenced file costing storage;
   * if we threw instead, a transient storage error would block the user from
   * deleting their own listing, which is the far worse failure. Failures are
   * logged so they can be swept up later.
   *
   * Silently ignores URLs that don't belong to our bucket. That covers old
   * Supabase Storage URLs, external URLs, and base64 data URLs left over from
   * earlier versions of the listing flow — none of which we can delete, and
   * none of which should stop a listing from being removed.
   */
  async deleteByPublicUrl(url: string): Promise<void> {
    const objectPath = this.objectPathFromPublicUrl(url);
    if (!objectPath) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectPath }),
      );
      // S3 delete is idempotent: removing a key that isn't there succeeds,
      // which is the desired end state anyway.
    } catch (err) {
      this.logger.warn(`Storage delete failed for ${objectPath}`, err as Error);
    }
  }

  /**
   * Inverse of the URL built at the end of `put`. Returns null when `url`
   * isn't a public URL for our bucket.
   *
   * Compared against our own configured public base rather than pattern-matched
   * loosely, so a URL pointing at some other bucket can't be coerced into a
   * delete against ours.
   */
  private objectPathFromPublicUrl(url: string): string | null {
    if (!url) return null;
    let prefix: string;
    try {
      prefix = `${this.publicBaseUrl}/`;
    } catch {
      // Storage isn't configured. Deletion is best-effort, so treat the URL as
      // not ours rather than failing the caller's delete.
      return null;
    }
    if (!url.startsWith(prefix)) return null;
    const path = url.slice(prefix.length).split('?')[0];
    return path || null;
  }

  /** Shared write path for both upload entry points. */
  private async put(
    buffer: Buffer,
    mimetype: string,
    ext: string,
    dressId: string,
  ): Promise<string> {
    const objectPath = `${dressId}/${randomUUID()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectPath,
          Body: buffer,
          ContentType: mimetype,
          // Listing photos never change once written — the flow replaces the
          // DressImage row with a new object rather than overwriting one — so
          // they can be cached hard at the edge.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error(`Storage upload failed for ${objectPath}`, err as Error);
      throw new InternalServerErrorException('העלאת התמונה נכשלה');
    }

    return `${this.publicBaseUrl}/${objectPath}`;
  }
}
