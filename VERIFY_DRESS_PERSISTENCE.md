# Verifying the dress flow really persists

The code migration is done, but **none of it has been run against your Supabase
project**. This sandbox has no network route to Supabase (DNS for
`aws-1-ap-southeast-2.pooler.supabase.com` doesn't resolve) and no npm registry
access, so migrations, bucket creation, `prisma generate`, and any browser test
were all impossible here. Everything below is unverified until you run it.

Work top to bottom. Steps 1–3 are prerequisites; **step 6 is the actual
launch-blocker test.**

---

## 1. Add the service-role key

`backend/.env` now has `SUPABASE_URL` filled in and an empty
`SUPABASE_SERVICE_ROLE_KEY`. Paste the key from **Supabase dashboard → Project
Settings → API → Project API keys → `service_role`**.

This key bypasses RLS. It belongs only in `backend/.env` — never in
`frontend/.env`, since anything `VITE_`-prefixed is compiled into the browser
bundle.

Image upload returns 500 with `SUPABASE_SERVICE_ROLE_KEY is not set` until this
is done.

## 2. Create the Storage bucket

Run `supabase/migrations/003_dress_images_bucket.sql` in the **Supabase SQL
editor**. It creates a public `dress-images` bucket (10MB, jpeg/png/webp) with
public read and authenticated write, and is safe to re-run.

Confirm: **Storage → Buckets** shows `dress-images`, marked Public.

## 3. Apply the database migration

```bash
cd backend
npx prisma migrate deploy   # applies 20260810180000_dress_flow_real_persistence
npx prisma generate         # regenerates the client for the new columns
```

`prisma generate` is not optional — the checked-in client still describes the
old schema, and **the backend will not compile until you run it.** (`npx tsc
--noEmit` currently reports 15 errors in `dresses.service.ts`, all of them
"property does not exist" against stale generated types. They should all
disappear after `generate`. If any survive, that's a real bug — send it to me.)

Confirm the migration landed:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'Dress' order by column_name;
```

Expect `title`/`desc` (not `name`/`description`), `region`, `store`, `phone`,
`email`, `size`, `colorHex`, `rejectReason`, and `condition`/`source`/
`dressLength`/`sleeveLength` as `text`.

## 4. Start both services

```bash
cd backend  && npm run start:dev     # :3000
cd frontend && npm run dev           # :5173, proxies /api → :3000
```

Swagger at <http://localhost:3000/docs> should list `POST /api/dresses`,
`PATCH /api/dresses/{id}`, `PATCH /api/dresses/{id}/booked`,
`PATCH /api/dresses/{id}/status`, and `POST /api/dresses/images`.

## 5. Confirm the catalogue starts genuinely empty

Open the site. The grid should be **empty** — no dresses at all.

If you still see the eight demo dresses (red evening gown, champagne maxi,
black cocktail…), the purge didn't run: hard-reload once. Those came from
`localStorage`, and nothing writes them any more.

Cross-check that the emptiness is real, not a silent failure:

```sql
select count(*) from "Dress";   -- 0 on a fresh database
```

---

## 6. The actual test: cross-browser persistence

This is the one that proves the bug is fixed. **You must use two genuinely
separate browsers** (e.g. Chrome + Firefox), or one normal window and one
private window in a *different* browser. Two tabs of the same browser share
localStorage and would pass even if nothing were fixed.

### Browser A — create

1. Register/sign in.
2. Publish a dress: fill every field, upload **2–3 real photos**.
3. Submit. You should land on the thank-you page.

Now verify it went to the real backend, not the browser:

- **Network tab**: `POST /api/dresses/images` returns `{"url": "https://…"}`
  once per photo, then `POST /api/dresses` returns 201. If you see no image
  requests, the old base64 path is somehow still live — stop and tell me.
- **Storage → dress-images → `pending/`**: your files are there.
- **SQL**:
  ```sql
  select d.id, d.title, d.status, d.email, i.url
  from "Dress" d left join "DressImage" i on i."dressId" = d.id
  order by d."createdAt" desc limit 5;
  ```
  One row per photo, each `url` an `https://…/storage/v1/object/public/dress-images/…`
  link. **If any `url` starts with `data:` the migration failed** — that's a
  base64 blob and it must never reach the database.
- Paste one of those URLs into a fresh tab: the photo loads without auth.

4. Approve the listing (`/#admin`, password `onenight2026`) so it's publicly
   visible — new listings start `pending` by design.

### Browser B — read back

5. Open the site in the **second browser**, signed out. The dress appears in
   the grid with its photos.
6. Open its detail page: title, price, size, description, region all match.

**This failing is the original bug. Anything else is a detail.**

### Back in Browser A — edit

7. Sign in, go to **השמלות שלי**, edit the title and price, save.
8. Toggle a few dates in the availability calendar.
9. Reload **Browser B**: the new title and price are there.
10. Confirm the calendar wrote rows, not browser state:
    ```sql
    select date, status from "DressAvailability"
    where "dressId" = '<id>' order by date;
    ```

### The paranoid check

11. In Browser A: DevTools → Application → Local Storage → **delete everything**
    for the site, then hard-reload.

    The dress must still be there. `onenight_dresses` and `onenight_users` must
    not reappear. (`onenight_user` and `onenight_favs` legitimately do — those
    are preferences, not listing data.)

---

## What I could not check, and where I'd expect trouble

Ranked by how likely they are to bite:

1. **Nothing here has ever executed.** No migration applied, no request served,
   no photo uploaded. Treat step 6 as the first real run.
2. **`prisma generate` must succeed** or the backend won't build (step 3).
3. **The `name` → `title` rename is destructive-ish.** If `Dress` already holds
   rows you care about, snapshot the table first. If it's empty (very likely —
   nothing ever wrote to it), there's nothing to lose.
4. **Publishing requires a registered user.** `POST /api/dresses` resolves the
   owner by email and 400s with *"לא נמצא משתמש עם כתובת המייל הזו"* if there's
   no match. Publishing while signed out will fail by design — confirm that's
   the behaviour you want, since the form's subtitle still says
   *"ללא צורך בהרשמה"* (no registration required). **That copy now contradicts
   the code.**
5. **Photos land in `pending/`**, because the publish form uploads before the
   dress row exists. Harmless (the URL is what's stored), but the folder name
   isn't the dress id. Worth a tidy-up pass later.
6. **Deleting a dress doesn't delete its files.** No cleanup path exists —
   orphaned objects will accumulate in the bucket.

## Out of scope, but I broke it and you should know

`frontend/src/pages/AuthPage.jsx` called the mock's `/api/auth/register` and
`/api/auth/login` with a `{phone, password}` shape. The real backend's
`api/auth` endpoints exist but take a different (email-based) body, so those two
calls would now fail.

**It appears to be dead code** — nothing navigates to `route === "login"`; auth
runs through `AuthContext`'s modal. I left it untouched rather than rewrite auth
inside a dress-persistence change. Either delete `AuthPage.jsx` or point it at
the real endpoints — but confirm it's genuinely unreachable first.
