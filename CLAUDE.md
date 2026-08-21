# oneNight — dress rental marketplace

Hebrew (RTL) marketplace for renting bridal/evening dresses.

## Stack

- **Frontend**: React 18 + Vite 7, Tailwind CSS 3, framer-motion, react-day-picker. Deployed on Vercel.
- **Backend**: NestJS 11 + TypeScript, class-validator DTOs, Swagger at `/docs`. Deployed on Render. Can also serve the built frontend statically for local single-command dev (`ServeStaticModule` in `app.module.ts`).
- **Database**: Neon Postgres (EU), via Prisma 5 (`previewFeatures = ["relationJoins"]` — re-run `prisma generate` after touching that line). Pooled `DATABASE_URL` (PgBouncer, `pgbouncer=true`) at runtime; unpooled `DIRECT_URL` for migrations only.
- **Storage**: Cloudflare R2 (S3-compatible) for listing photos, via `@aws-sdk/client-s3`. Public reads go through a separate `R2_PUBLIC_BASE_URL`, not the S3 endpoint.
- **Email**: Resend, called directly over `fetch` (not the `resend` SDK) from `backend/src/common/mail.service.ts`. Used for OTP login codes and dress approval/rejection notifications.
- **AI photos**: fashn.ai, admin-only tool to generate on-model shots (`backend/src/dresses/ai-photo.service.ts`).

## Design system

Source of truth is `frontend/src/styles.css` `:root` (CSS custom properties) — current palette is **wine-red**, not the emerald/gold scheme sometimes discussed as a future rebrand:

- `--brand: #8B3A3A`, `--brand-dark: #6E2C2C`, `--brand-light: #F0E8E8`
- `--ink` / `--text: #1A1714`, `--canvas` / `--bg: rgba(110,44,44,0.08)`
- `--gold: #B89B6E` (accent/rule color), `--success: #4A7C59`
- Legacy aliases (`--rose`, `--rose-deep`, `--surface`, `--border`, etc.) remap onto the same palette so older markup stays on-brand — prefer the new names in new code.

`frontend/src/constants/theme.js` holds a **separate, hardcoded** `COLORS`/`FONTS` JS object for contexts CSS can't reach (canvas `fillStyle`, SVG `data:` URIs, inline styles). It is not synced automatically with `styles.css` — if you change the palette, update both.

- Headings: `'Frank Ruhl Libre', serif`. Body: `'Assistant', system-ui, sans-serif`. Latin display accents: Cormorant Garamond / Playfair Display.
- RTL throughout (`direction: rtl` on `body`); mind logical properties (`margin-inline-*`, `padding-inline-*`) over `left`/`right`.
- Corners are **not** globally sharp — `--r-xs/sm/md/lg` (2/4/8/12px) are used on cards, buttons, chips, etc. The one deliberately-square exception is the `.onenight-cal` override for react-day-picker.
- Glassmorphism (`backdrop-filter: blur(...) saturate(...)`) is used throughout on modals, filter panels, and overlays — it's a real, load-bearing part of the visual language, not incidental.
- `DEFAULT_DRESS_COLOR_HEX` (theme.js) is written into the DB as `Dress.colorHex` on publish — keep it a real hex literal, never a `var()`/CSS reference.

## Database rules

- Always `npx prisma migrate dev --name ...` for schema changes. **Never** `prisma db push` — migration history must be preserved and is the source of truth (per `prisma/migrations/`).
- Never delete a migration directory that has already run against the database.
- **Stop and ask before any destructive or irreversible database action** (dropping/truncating data, editing a migration that already ran, resetting the DB), even if nothing is technically blocking it.
- The cloud sandbox cannot reach Neon or npm — hand Prisma commands (`migrate dev`, `generate`, `npm install`) to the user to run locally, along with the expected SQL/diff so they can verify before applying.

## General workflow rules

- **Stop and confirm before any destructive/irreversible action** — not just DB: deleting files, force-pushing, overwriting uncommitted work, rotating credentials, etc.
- Don't add scripts, tooling, tests, or dependencies that weren't explicitly requested.
- When a task has a straightforward option and a fancier one that changes cost, architecture, or scope, **flag the tradeoff and let the user decide** rather than silently picking the more expensive/complex path.

## Code conventions

- NestJS modules follow the standard `*.module.ts` / `*.controller.ts` / `*.service.ts` split, one feature folder per domain (`dresses/`, `users/`, `auth-otp/`, `booking-inquiries/`, `contact-inquiries/`, `common/`), DTOs under a `dto/` subfolder.
- `@Global()` modules (`PrismaModule`, `MailModule`) are injectable anywhere without a per-module import — don't re-import them.
- Frontend: `pages/` (route-level), `components/<domain>/` (feature-scoped), `components/ui/` (generic), `hooks/`, `lib/` (api client, data helpers, normalization), `constants/`.
- No test suite and no linter/formatter config currently in the repo — don't introduce one unless asked.

## Code Style

- Do not add comments to code — no inline comments, no block comments, no JSDoc — unless the user explicitly asks for comments in that specific request. This applies to all code generation and edits, without exception, going forward.

## Known gotchas (verified current)

- **`.env` loading has no library behind it.** There's no `dotenv`/`@nestjs/config`. Importing `@prisma/client` populates `process.env` from `backend/.env` as a side effect; `backend/src/common/load-env.ts` now does this explicitly and **must stay the first import in `main.ts`**.
- **Resend `MailService.send()` returns a `MailResult`, it never throws.** Callers are notifying about something that already committed (a moderation decision), so a failed send must not fail the request. `OtpService` is intentionally different — it throws, since the user is waiting on that code synchronously.
- **`RESEND_FROM`'s domain must stay verified in the Resend dashboard**, or sends 403 even with a valid API key — `onboarding@resend.dev` works unverified but only delivers to the Resend account owner's own address.
- **FASHN pose/seed is deterministic, not random**: `seed = hash32(`${dressId}-${poseIndex}`)`, `poseIndex = hash32(dressId) % POSE_VARIATIONS.length`. Same dress → same pose/seed every time by design (`ai-photo.service.ts`, `directionFor`). Don't "fix" apparent repetition without reading that comment block first.
- **R2 image URLs are a copy, not a proxy.** FASHN's own CDN URLs expire after 3 days, so `StorageService.uploadFromUrl` re-uploads the bytes into our bucket immediately; `isAiGenerated` on `DressImage` is what distinguishes an AI photo, not the URL shape.
- **`R2_PUBLIC_BASE_URL` is baked into every stored image URL.** Changing it later means rewriting existing `DressImage` rows, not just the env var.
- **`StorageService`'s S3 client is a singleton** (built once, reused) — deliberately, per a comment referencing a past bug where a fresh client per request meant a fresh connection pool per request.
- **`FRONTEND_URL` drives both CORS and the deep link in approval emails** (`<FRONTEND_URL>/#dress=<id>`). Left unset, CORS falls back to allow-any-origin and the email link falls back to `http://localhost:5173` — fine locally, silently wrong once deployed if forgotten on Render.
- **Listing ownership is an email-string match**, not a session (`/api/dresses/mine`, delete). Anyone who knows an address can read that person's listings; the admin gate is a single shared password. Both are called out in the repo's own README as temporary, pending real auth.
- The device mount for this repo has its own quirks (no `rm`/unlink, permission-denied on rewriting an already-touched file, CRLF line endings) — see project memory `device_mount_quirks.md` before doing bulk file operations here.
