import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateContactInquiryDto {
  @ApiProperty({ description: 'Mark as dealt with (or clear the flag)' })
  @IsBoolean()
  handled!: boolean;
}
