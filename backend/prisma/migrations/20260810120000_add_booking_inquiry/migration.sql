-- CreateTable
CREATE TABLE "BookingInquiry" (
    "id" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "renterPhone" TEXT NOT NULL,
    "dressId" TEXT NOT NULL,
    "dressTitle" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "selectedStartDate" TIMESTAMP(3) NOT NULL,
    "selectedEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingInquiry_renterId_idx" ON "BookingInquiry"("renterId");

-- CreateIndex
CREATE INDEX "BookingInquiry_dressId_idx" ON "BookingInquiry"("dressId");

-- CreateIndex
CREATE INDEX "BookingInquiry_createdAt_idx" ON "BookingInquiry"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
