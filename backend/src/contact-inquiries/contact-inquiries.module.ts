import { Module } from '@nestjs/common';
import { ContactInquiriesController } from './contact-inquiries.controller';
import { ContactInquiriesService } from './contact-inquiries.service';

/**
 * "צור קשר" messages — public submit, admin-gated read/update/delete.
 * Depends on the global PrismaModule for data access, so there is no provider
 * wiring here beyond the service (same pattern as BookingInquiriesModule).
 */
@Module({
  controllers: [ContactInquiriesController],
  providers: [ContactInquiriesService],
})
export class ContactInquiriesModule {}
