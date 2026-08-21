/**
 * Upload the shared studio backdrop to Cloudflare R2, under the exact key
 * AiPhotoService expects.
 *
 *   node scripts/upload-studio-backdrop.mjs
 *
 * Run from backend/, after `python3 scripts/make-studio-backdrop.py` has
 * produced the PNG next to this file. Prints the resulting public URL, which
 * should match what AiPhotoService.backgroundReferenceUrl builds — verify by
 * opening it in a browser, because FASHN fetches that URL on every generation
 * and a 404 there fails every prediction with ImageLoadError.
 *
 * Uses @aws-sdk/client-s3, already a dependency, and mirrors StorageService's
 * client configuration exactly — including `requestChecksumCalculation`, which
 * R2 needs and whose absence produces a signature error that reads like bad
 * credentials. If this script and StorageService ever disagree about how to
 * talk to R2, StorageService is the source of truth.
 *
 * Safe to re-run: it overwrites the same key rather than versioning, so a
 * regenerated backdrop replaces the old one and every future generation picks
 * it up. Generations already stored are unaffected — they are copies in the
 * bucket, not references to this file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/* Must stay in step with STUDIO_BACKGROUND_KEY in src/dresses/ai-photo.service.ts. */
const KEY = 'studio/studio-backdrop-cream-1600x2000.png';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, 'studio-backdrop-cream-1600x2000.png');

/* Minimal .env reader. Same rules as src/common/load-env.ts (real environment
   wins, surrounding quotes stripped) — duplicated rather than imported because
   that file is TypeScript and this script runs under plain node with no build
   step. */
function loadEnv() {
  const envPath = join(here, '..', '.env');
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') ||
        (value[0] === "'" && value.at(-1) === "'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ ${name} is not set (backend/.env or the environment).`);
    process.exit(1);
  }
  return value;
}

loadEnv();

if (!existsSync(FILE)) {
  console.error(`✗ ${FILE} not found. Run: python3 scripts/make-studio-backdrop.py`);
  process.exit(1);
}

const accountId = required('R2_ACCOUNT_ID');
const bucket = process.env.R2_BUCKET || 'dress-images';
const publicBase = required('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');

const body = readFileSync(FILE);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

await s3.send(new PutObjectCommand({
  Bucket: bucket,
  Key: KEY,
  Body: body,
  ContentType: 'image/png',
  /* Immutable in practice: the key is fixed and the content only changes when
     someone deliberately regenerates it. A long max-age keeps FASHN from
     re-downloading 35KB on every prediction in a batch. */
  CacheControl: 'public, max-age=31536000, immutable',
}));

const url = `${publicBase}/${KEY}`;
console.log(`✓ uploaded ${body.length} bytes to ${bucket}/${KEY}`);
console.log(`  public URL: ${url}`);
console.log('  Open it in a browser to confirm it is publicly readable before generating.');
