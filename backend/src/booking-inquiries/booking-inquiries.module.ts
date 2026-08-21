import { Module } from '@nestjs/common';
import { BookingInquiriesController } from './booking-inquiries.controller';
import { BookingInquiriesService } from './booking-inquiries.service';

@Module({
  controllers: [BookingInquiriesController],
  providers: [BookingInquiriesService],
})
export class BookingInquiriesModule {}
