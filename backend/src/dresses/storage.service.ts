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

const DEFAULT_BUCKET = 'dress-images';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

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
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }

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

  async deleteByPublicUrl(url: string): Promise<void> {
    const objectPath = this.objectPathFromPublicUrl(url);
    if (!objectPath) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectPath }),
      );
    } catch (err) {
      this.logger.warn(`Storage delete failed for ${objectPath}`, err as Error);
    }
  }

  private objectPathFromPublicUrl(url: string): string | null {
    if (!url) return null;
    let prefix: string;
    try {
      prefix = `${this.publicBaseUrl}/`;
    } catch {
      return null;
    }
    if (!url.startsWith(prefix)) return null;
    const path = url.slice(prefix.length).split('?')[0];
    return path || null;
  }

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
