import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID } from 'class-validator';

/**
 * Body for POST /api/booking-inquiries — logged in parallel to the existing
 * WhatsApp "להזמנה" click (ProductPage.jsx's book()), never in place of it.
 * `renterId` is a real User id: this button already requires the renter to
 * be logged in before it does anything, so there is always a genuine
 * account behind the click. The dress/owner fields are a snapshot rather
 * than a lookup — see the schema comment on BookingInquiry for why.
 */
export class CreateBookingInquiryDto {
  @ApiProperty() @IsUUID() renterId!: string;

  @ApiProperty() @IsString() renterPhone!: string;

  @ApiProperty() @IsString() dressId!: string;

  @ApiProperty() @IsString() dressTitle!: string;

  @ApiProperty() @IsString() ownerPhone!: string;

  @ApiProperty() @IsDateString() selectedStartDate!: string;

  @ApiProperty() @IsDateString() selectedEndDate!: string;
}
