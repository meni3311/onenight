import { Module } from '@nestjs/common';
import { BookingInquiriesController } from './booking-inquiries.controller';
import { BookingInquiriesService } from './booking-inquiries.service';

/**
 * Logs "להזמנה" button clicks for admin follow-up. Depends on the global
 * PrismaModule for data access (see DressesModule for the same pattern) —
 * no provider wiring beyond the service is required here.
 */
@Module({
  controllers: [BookingInquiriesController],
  providers: [BookingInquiriesService],
})
export class BookingInquiriesModule {}
