/*
  Warnings:

  - You are about to drop the column `length` on the `Dress` table. All the
    data in that column will be lost. `dressLength` (added in
    20260808220000_add_dress_length_sleeve_length) is now the single source
    of truth for a dress's length — this column was a pre-existing duplicate
    that the app no longer writes to.

*/
-- AlterTable
ALTER TABLE "Dress" DROP COLUMN "length",
ADD COLUMN     "city" TEXT;
