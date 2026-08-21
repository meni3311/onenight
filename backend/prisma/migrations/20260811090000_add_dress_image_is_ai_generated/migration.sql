-- Admin-only AI virtual try-on photos (see src/dresses/ai-photo.service.ts).
--
-- Flags a DressImage row as produced by the try-on tool rather than uploaded
-- by the lister, so the admin grid can badge it. Presentational only — no
-- customer-facing behaviour reads this column.
--
-- Deliberately NOT adding an `isPrimary` column: the cover photo is already
-- tracked by `order` (lowest order wins), and the feature reuses that.

ALTER TABLE "DressImage"
  ADD COLUMN "isAiGenerated" BOOLEAN NOT NULL DEFAULT false;
