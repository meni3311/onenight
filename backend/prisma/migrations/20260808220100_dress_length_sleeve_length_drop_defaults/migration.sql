/*
  Follow-up to 20260808220000_add_dress_length_sleeve_length: every existing
  row was backfilled to 'MEDIUM' by that migration, so it is now safe to drop
  the temporary defaults. The columns stay NOT NULL — going forward, callers
  (the Prisma client / NestJS DTO validation) must always supply a value.
*/
-- AlterTable
ALTER TABLE "Dress" ALTER COLUMN "dressLength" DROP DEFAULT;
ALTER TABLE "Dress" ALTER COLUMN "sleeveLength" DROP DEFAULT;
