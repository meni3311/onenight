/*
  Warnings:

  - You are about to drop the column `url1200` on the `DressImage` table. All the data in the column will be lost.
  - You are about to drop the column `url400` on the `DressImage` table. All the data in the column will be lost.
  - You are about to drop the column `url800` on the `DressImage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DressImage" DROP COLUMN "url1200",
DROP COLUMN "url400",
DROP COLUMN "url800";
