import { Module } from '@nestjs/common';
import { ContactInquiriesController } from './contact-inquiries.controller';
import { ContactInquiriesService } from './contact-inquiries.service';

@Module({
  controllers: [ContactInquiriesController],
  providers: [ContactInquiriesService],
})
export class ContactInquiriesModule {}
