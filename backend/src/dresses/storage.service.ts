import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
// sharp uses `export =`, so the instance type has to be pulled in by name
// rather than reached through a `sharp.` namespace on the default import.
import sharp, { type Sharp } from 'sharp';

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

/**
 * Widths generated alongside every upload, matching how the images are
 * actually displayed: the browse grid is at most 4 columns so a card is
 * ~300px (400 covers it, 800 covers it at 2x), and 1200 covers the detail
 * gallery. See the `sizes` attribute in frontend Img.jsx.
 */
const VARIANT_WIDTHS = [400, 800, 1200] as const;

/** Longest edge kept for the stored "original". A 12MP phone photo has no
 *  business being served to anyone; this is the detail view's ceiling. */
const MAX_ORIGINAL_WIDTH = 1600;

const QUALITY = 80;

/**
 * Path segment marking objects written by the resizing pipeline.
 *
 * The publish form uploads photos *before* the dress row exists, gets plain
 * URL strings back, and posts those strings in createDress — so there is no
 * channel through which "this image has variants" could be passed without
 * changing the DTO and the upload flow. Encoding it in the path instead
 * makes variant existence derivable from the URL alone: anything under this
 * prefix was written with all three widths, anything else predates the
 * pipeline and has none. That keeps one source of truth rather than a
 * database flag that could drift from what is actually in the bucket.
 */
const VARIANT_PREFIX = 'v2';

/** The three variant URLs for a stored image, or nulls when it predates
 *  the resizing pipeline. */
export interface ImageVariants {
  url400: string | null;
  url800: string | null;
  url1200: string | null;
}

const NO_VARIANTS: ImageVariants = { url400: null, url800: null, url1200: null };

/**
 * `.../v2/<dress>/<uuid>.jpg` + 400 -> `.../v2/<dress>/<uuid>_400.jpg`
 *
 * The extension is searched for only within the last path segment. Scanning
 * the whole URL would find the dot in the *hostname* for an extension-less
 * path and splice the width into the domain.
 */
function withWidthSuffix(url: string, width: number): string {
  const slash = url.lastIndexOf('/');
  const dot = url.indexOf('.', slash + 1);
  return dot === -1
    ? `${url}_${width}`
    : `${url.slice(0, dot)}_${width}${url.slice(dot)}`;
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

  /**
   * Removes the stored object behind a public URL. Best-effort by design.
   *
   * BEST-EFFORT IS DELIBERATE: callers delete the database row too, and the
   * row is the source of truth for what a listing shows. If the bucket
   * delete fails, the worst outcome is an unreferenced file costing storage;
   * if we threw instead, a transient Storage error would block the user from
   * deleting their own listing, which is the far worse failure. Failures are
   * logged so they can be swept up later.
   *
   * Silently ignores URLs that don't belong to our bucket. Listings created
   * before the Supabase migration can still hold external URLs (and base64
   * data URLs), and those have nothing for us to delete.
   */
  async deleteByPublicUrl(url: string): Promise<void> {
    const objectPath = this.objectPathFromPublicUrl(url);
    if (!objectPath) return;

    const endpoint = `${this.baseUrl}/storage/v1/object/${BUCKET}/${objectPath}`;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.serviceKey}` },
      });
      // 404 means it's already gone — that's the desired end state, not a
      // failure worth logging.
      if (!res.ok && res.status !== 404) {
        const detail = await res.text().catch(() => '');
        this.logger.warn(
          `Storage delete failed for ${objectPath}: ${res.status} ${res.statusText} ${detail}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Storage delete threw for ${objectPath}`, err as Error);
    }
  }

  /**
   * Inverse of the URL built at the end of `put`. Returns null when `url`
   * isn't a public URL for this project's bucket.
   *
   * Compared against our own configured base URL rather than pattern-matched
   * loosely, so a URL pointing at some other Supabase project can't be
   * coerced into a delete against ours.
   */
  private objectPathFromPublicUrl(url: string): string | null {
    if (!url) return null;
    const prefix = `${this.baseUrl}/storage/v1/object/public/${BUCKET}/`;
    if (!url.startsWith(prefix)) return null;
    const path = url.slice(prefix.length).split('?')[0];
    return path || null;
  }

  /**
   * The variant URLs for a stored image, derived from its path.
   *
   * Returns nulls for anything not written by the resizing pipeline, so a
   * pre-pipeline photo reports "no variants" rather than pointing a srcset
   * at objects that were never created.
   */
  variantsFor(url: string): ImageVariants {
    const marker = `/storage/v1/object/public/${BUCKET}/${VARIANT_PREFIX}/`;
    if (!url || !url.includes(marker)) return { ...NO_VARIANTS };
    return {
      url400: withWidthSuffix(url, 400),
      url800: withWidthSuffix(url, 800),
      url1200: withWidthSuffix(url, 1200),
    };
  }

  /**
   * Shared write path for both upload entry points.
   *
   * Re-encodes the original down to MAX_ORIGINAL_WIDTH and writes three
   * narrower variants beside it. `withoutEnlargement` means a small source
   * is never upscaled — the variant object still exists, it's just capped at
   * the source's own width, which keeps "under the v2 prefix => all three
   * widths exist" true without wasting bytes on fake resolution.
   *
   * If sharp can't process the bytes at all, the upload still succeeds: the
   * original is written unmodified at the *legacy* path (no v2 prefix), so
   * variantsFor() correctly reports none. A listing photo that can't be
   * resized is worth more than a failed publish.
   */
  private async put(
    buffer: Buffer,
    mimetype: string,
    ext: string,
    dressId: string,
  ): Promise<string> {
    const id = randomUUID();

    let main = buffer;
    let variants: { width: number; body: Buffer }[] = [];
    let resized = true;
    try {
      const pipeline = () => sharp(buffer).rotate(); // rotate() honours EXIF
      main = await this.encode(pipeline().resize({
        width: MAX_ORIGINAL_WIDTH,
        withoutEnlargement: true,
      }), ext);
      variants = await Promise.all(
        VARIANT_WIDTHS.map(async (width) => ({
          width,
          body: await this.encode(
            pipeline().resize({ width, withoutEnlargement: true }),
            ext,
          ),
        })),
      );
    } catch (err) {
      this.logger.warn(
        `sharp could not process an upload for ${dressId}; storing the original unresized. ${(err as Error).message}`,
      );
      main = buffer;
      variants = [];
      resized = false;
    }

    const dir = resized ? `${VARIANT_PREFIX}/${dressId}` : dressId;
    const objectPath = `${dir}/${id}.${ext}`;

    await this.putObject(objectPath, main, mimetype);
    // Variants are written after the original so a failure mid-way can never
    // leave a v2-prefixed original whose variants are missing.
    for (const v of variants) {
      await this.putObject(`${dir}/${id}_${v.width}.${ext}`, v.body, mimetype);
    }

    return `${this.baseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  }

  /** Re-encode a sharp pipeline into the same format it came in as. */
  private encode(pipeline: Sharp, ext: string): Promise<Buffer> {
    if (ext === 'png') return pipeline.png({ compressionLevel: 9 }).toBuffer();
    if (ext === 'webp') return pipeline.webp({ quality: QUALITY }).toBuffer();
    return pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
  }

  /** One PUT into the bucket. */
  private async putObject(
    objectPath: string,
    body: Buffer,
    mimetype: string,
  ): Promise<void> {
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
        body: new Uint8Array(body),
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
  }
}
