-- Resized image variants (see src/dresses/storage.service.ts).
--
-- Every new upload is downscaled and re-encoded into three widths alongside
-- the original, so the browse grid can request a ~400px file instead of a
-- full-resolution camera photo. These columns hold the public URLs of those
-- objects.
--
-- ALL THREE ARE NULLABLE, DELIBERATELY: photos already in the bucket were
-- written before the resizing pipeline existed and have no variants. Null
-- means "no variant available" and the client falls back to `url`, so no
-- backfill is required and nothing points at a missing object.
--
-- Note there is no `isResized` flag: whether variants exist is inferable
-- from the object path (the pipeline writes under a versioned prefix), so a
-- second source of truth would only be able to disagree with the first.

ALTER TABLE "DressImage"
  ADD COLUMN "url400"  TEXT,
  ADD COLUMN "url800"  TEXT,
  ADD COLUMN "url1200" TEXT;
