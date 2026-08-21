-- CreateTable
CREATE TABLE "DressAvailability" (
    "id" TEXT NOT NULL,
    "dressId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unavailable',

    CONSTRAINT "DressAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DressAvailability_dressId_idx" ON "DressAvailability"("dressId");

-- CreateIndex
CREATE UNIQUE INDEX "DressAvailability_dressId_date_key" ON "DressAvailability"("dressId", "date");

-- AddForeignKey
ALTER TABLE "DressAvailability" ADD CONSTRAINT "DressAvailability_dressId_fkey" FOREIGN KEY ("dressId") REFERENCES "Dress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
