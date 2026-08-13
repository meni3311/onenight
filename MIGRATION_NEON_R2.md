# Supabase → Neon + Cloudflare R2

## Why

The Supabase free tier put the database in `ap-southeast-2` (Sydney). From
Israel a single Prisma round trip cost **~1.8s**, and eight concurrent
`SELECT 1`s took eight times as long as one instead of overlapping — the
connections were being serialized somewhere below Prisma's pool. Raising
`connection_limit` changed nothing.

Distance was the dominant term, and the fix for distance is to move. Supabase
Pro ($25/mo) would have allowed a closer region; **Neon** (Postgres, EU) plus
**Cloudflare R2** (object storage) does the same for less, and splits the two
concerns apart so neither is hostage to the other's pricing.

Nothing about auth changed. Auth here is bcrypt + Resend OTP, written by us —
Supabase Auth was never used, so this was only ever a database and storage
swap.

## What changed in the code

| | Before | After |
|---|---|---|
| Postgres | Supabase (`ap-southeast-2`) | Neon (EU) |
| Object storage | Supabase Storage, REST via `fetch` | Cloudflare R2, `@aws-sdk/client-s3` |
| Storage env vars | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` |
| Public image URL | `…/storage/v1/object/public/dress-images/<path>` | `<R2_PUBLIC_BASE_URL>/<path>` |

`StorageService`'s public interface is unchanged — `uploadDressImage`,
`uploadFromUrl`, `deleteByPublicUrl`, and the `UploadedImage` type all keep
their exact signatures, so `DressesController`, `DressesService`, and
`AiPhotoService` were not touched beyond one stale comment.

Two implementation notes worth knowing:

- **`region: 'auto'` and an explicit endpoint.** R2 has no S3-style regions
  (where data lives is a bucket-creation setting), and without an explicit
  endpoint the SDK builds an `amazonaws.com` hostname.
- **`requestChecksumCalculation: 'WHEN_REQUIRED'`.** Recent AWS SDK versions
  attach a CRC32 checksum header to every request by default; R2 rejects
  checksum headers it didn't ask for, and the resulting error reads like a
  credentials problem. This confines checksums to the operations that
  genuinely need them.

`@supabase/supabase-js` was never a dependency — the old service used plain
`fetch` — so there was nothing to uninstall. The frontend never imported a
Supabase client either; its two `VITE_SUPABASE_*` variables were unused
placeholders and have been removed.

## Setup — what you do in the dashboards

### Neon

1. **Create the project**, region **Europe (Frankfurt)** — `aws-eu-central-1`.
   Postgres 16 is fine.
2. **Connect → Connection string**, and copy it **twice**:
   - with **Connection pooling ON** → this is `DATABASE_URL`
   - with **Connection pooling OFF** → this is `DIRECT_URL`

   They differ only by `-pooler` in the hostname.
3. Append `&pgbouncer=true` to the pooled one. Neon's pooler runs PgBouncer in
   transaction mode; without this flag Prisma uses prepared statements the
   pooler cannot hold across transactions, and you get intermittent
   `prepared statement "s0" already exists` errors under load.
4. Paste both into `backend/.env` (see `.env.example` for the exact shape).

### Cloudflare R2

1. **R2 → Create bucket**, name `dress-images`, location hint **EU**.
2. **Manage API tokens → Create API token**, permission **Object Read & Write**,
   scoped to that bucket. Copy the **Access Key ID** and **Secret Access Key** —
   the secret is shown once.
3. **Account ID**: R2 → Overview, right-hand sidebar.
4. **Public access**: bucket → Settings → either enable the **Public
   Development URL** (`https://pub-<hash>.r2.dev`) or connect a custom domain.
   A custom domain is the better long-term answer — `r2.dev` is rate-limited
   and explicitly not for production — but either works to start.

   This origin gets baked into every stored image URL, so changing it later
   means rewriting `DressImage` rows. Pick the one you intend to keep.

## Cutover

```bash
cd backend

npm install                                  # pulls @aws-sdk/client-s3

npx prisma migrate deploy                    # recreates the full schema on Neon
npx prisma generate

npx ts-node scripts/db-latency-probe.ts      # confirm the latency is actually gone
npx tsc --noEmit
npm run build

cd ../frontend && npm run build
```

`migrate deploy` replays the checked-in migration history rather than
`db push`ing the current schema, so the new database's `_prisma_migrations`
table matches the repo and future migrations apply cleanly.

The probe should report low-tens-of-ms sequential timings and ratios near 1.
The old setup measured ~1800ms with a ratio near 8.

### Smoke test

Follow `VERIFY_DRESS_PERSISTENCE.md` step 6 — publish a dress with photos in
one browser, read it back in another. The checks to care about here:

- `POST /api/dresses/images` returns a URL starting with `R2_PUBLIC_BASE_URL`
- that URL opens in a fresh tab without auth
- the object appears under `pending/` in the R2 bucket
- deleting the listing removes the object

### Data

The old Supabase database held one dress listing with four images and no real
users, so nothing was dumped or restored — the new database starts empty with
a complete schema. Re-upload that listing's photos by hand after cutover; the
old Supabase Storage URLs will not resolve once the project is paused, and
`deleteByPublicUrl` deliberately ignores them.

**Keep the Supabase project alive until the smoke test passes.** Deleting it is
the one irreversible step in this migration.
