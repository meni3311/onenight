import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateBookingInquiryDto {
  @ApiProperty() @IsUUID() renterId!: string;

  @ApiProperty() @IsString() renterPhone!: string;

  @ApiProperty() @IsString() dressId!: string;

  @ApiProperty() @IsString() dressTitle!: string;

  @ApiProperty() @IsString() ownerPhone!: string;

  @ApiProperty() @IsDateString() selectedStartDate!: string;

  @ApiProperty() @IsDateString() selectedEndDate!: string;
}
