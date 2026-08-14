/*
  Warnings:

  - You are about to drop the column `size` on the `Dress` table. All the data in the column will be lost.
  - You are about to drop the `DressSize` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `Dress` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DressCategory" AS ENUM ('bridal', 'bridesmaid', 'evening', 'plus_size');

-- DropForeignKey
ALTER TABLE "DressSize" DROP CONSTRAINT "DressSize_dressId_fkey";

-- AlterTable
ALTER TABLE "Dress" DROP COLUMN "size",
ADD COLUMN     "bridesmaidSetCount" INTEGER,
ADD COLUMN     "category" "DressCategory" NOT NULL,
ADD COLUMN     "hashtags" TEXT[],
ADD COLUMN     "sizes" TEXT[];

-- DropTable
DROP TABLE "DressSize";

-- CreateIndex
CREATE INDEX "Dress_category_idx" ON "Dress"("category");
