-- Let a BookingInquiry survive its renter's account deletion.
--
-- renterId was NOT NULL with ON DELETE RESTRICT, which would block
-- UsersService.deleteAccount from ever removing a user who had sent a
-- booking inquiry. The row is already a self-contained snapshot
-- (renterPhone/dressTitle/ownerPhone/dates), same as how Dress deletion
-- already leaves inquiries behind — so on delete we just null the link
-- instead of blocking or cascading.
ALTER TABLE "BookingInquiry" DROP CONSTRAINT "BookingInquiry_renterId_fkey";

ALTER TABLE "BookingInquiry" ALTER COLUMN "renterId" DROP NOT NULL;

ALTER TABLE "BookingInquiry" ADD CONSTRAINT "BookingInquiry_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
