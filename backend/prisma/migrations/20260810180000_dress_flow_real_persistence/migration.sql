-- ============================================================================
-- Move the dress flow off the localStorage mock and onto real Postgres.
--
-- Two things happen here:
--   1. `name`/`description` are renamed to `title`/`desc` to match the publish
--      form's field names (frontend/src/pages/PublishPage.jsx).
--   2. The four enum columns become plain text holding the Hebrew labels the
--      UI already uses, and the now-unused enum types are dropped.
--   3. The remaining publish-form fields get real columns.
--
-- Renames (not drop+add) so any existing rows keep their data.
-- ============================================================================

-- ---------------------------------------------------------------- 1. renames
ALTER TABLE "Dress" RENAME COLUMN "name" TO "title";
ALTER TABLE "Dress" RENAME COLUMN "description" TO "desc";

-- ------------------------------------------------- 2. enums -> text (Hebrew)
-- ALTER TYPE rebuilds the dependent indexes on dressLength/sleeveLength
-- automatically, so they don't need to be dropped and recreated.
ALTER TABLE "Dress" ALTER COLUMN "condition"    TYPE TEXT USING "condition"::TEXT;
ALTER TABLE "Dress" ALTER COLUMN "source"       TYPE TEXT USING "source"::TEXT;
ALTER TABLE "Dress" ALTER COLUMN "dressLength"  TYPE TEXT USING "dressLength"::TEXT;
ALTER TABLE "Dress" ALTER COLUMN "sleeveLength" TYPE TEXT USING "sleeveLength"::TEXT;

-- Translate any pre-existing rows from the old enum labels to the Hebrew
-- values the UI matches on. No-ops on an empty table.
UPDATE "Dress" SET "condition" = CASE "condition"
  WHEN 'NEW'       THEN 'חדשה'
  WHEN 'LIKE_NEW'  THEN 'כמו חדשה'
  WHEN 'VERY_GOOD' THEN 'טובה מאוד'
  WHEN 'GOOD'      THEN 'טובה'
  WHEN 'FAIR'      THEN 'סבירה'
  ELSE "condition"
END;

-- BOUTIQUE has no distinct counterpart in the form's two-option source list
-- (תפירה אישית / שם חנות), so it folds into "שם חנות".
UPDATE "Dress" SET "source" = CASE "source"
  WHEN 'PERSONAL_TAILOR' THEN 'תפירה אישית'
  WHEN 'STORE'           THEN 'שם חנות'
  WHEN 'BOUTIQUE'        THEN 'שם חנות'
  ELSE "source"
END;

UPDATE "Dress" SET "dressLength" = CASE "dressLength"
  WHEN 'SHORT'  THEN 'קצר'
  WHEN 'MEDIUM' THEN 'אמצע'
  WHEN 'LONG'   THEN 'ארוך'
  ELSE "dressLength"
END;

UPDATE "Dress" SET "sleeveLength" = CASE "sleeveLength"
  WHEN 'SHORT'  THEN 'קצר'
  WHEN 'MEDIUM' THEN 'אמצע'
  WHEN 'LONG'   THEN 'ארוך'
  ELSE "sleeveLength"
END;

DROP TYPE IF EXISTS "DressCondition";
DROP TYPE IF EXISTS "DressSource";
DROP TYPE IF EXISTS "DressLength";
DROP TYPE IF EXISTS "SleeveLength";

-- --------------------------------------------------- 3. publish-form columns
ALTER TABLE "Dress" ADD COLUMN "colorHex" TEXT;
ALTER TABLE "Dress" ADD COLUMN "store"    TEXT;
ALTER TABLE "Dress" ADD COLUMN "region"   TEXT;
ALTER TABLE "Dress" ADD COLUMN "phone"    TEXT;
ALTER TABLE "Dress" ADD COLUMN "email"    TEXT;
ALTER TABLE "Dress" ADD COLUMN "size"     TEXT;
-- Admin's note when a listing is rejected.
ALTER TABLE "Dress" ADD COLUMN "rejectReason" TEXT;

-- `email` resolves a listing to its owner in the "my listings" view, and
-- `region` is a browse filter facet — both are looked up on every load.
CREATE INDEX "Dress_email_idx"  ON "Dress"("email");
CREATE INDEX "Dress_region_idx" ON "Dress"("region");
