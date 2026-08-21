/*
  Warnings:

  - Added the required columns `dressLength` and `sleeveLength` to the `Dress`
    table. Existing rows are backfilled with a temporary default ('MEDIUM')
    so the migration does not fail or drop data on a non-empty table. The
    default is removed in the follow-up migration
    `20260808220100_dress_length_sleeve_length_drop_defaults`, once every row
    has a real value — new inserts must supply one explicitly from then on
    (enforced by the Prisma schema having no `@default` on these fields).

*/
-- CreateEnum
CREATE TYPE "DressLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "SleeveLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- AlterTable
ALTER TABLE "Dress" ADD COLUMN     "dressLength" "DressLength" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "sleeveLength" "SleeveLength" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "Dress_dressLength_idx" ON "Dress"("dressLength");

-- CreateIndex
CREATE INDEX "Dress_sleeveLength_idx" ON "Dress"("sleeveLength");
