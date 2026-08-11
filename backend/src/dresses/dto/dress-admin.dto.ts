import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Body for PATCH /dresses/:id/status — admin approve/reject. */
export class UpdateDressStatusDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'pending'] })
  @IsIn(['approved', 'rejected', 'pending'])
  status!: string;

  @ApiPropertyOptional({ description: 'Shown to the owner when status is "rejected"' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectReason?: string;
}

/** Body for PATCH /dresses/:id/booked — toggle one day on the owner's calendar. */
export class ToggleBookedDateDto {
  @ApiProperty({ example: '2026-08-14', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'key must be YYYY-MM-DD' })
  key!: string;
}
