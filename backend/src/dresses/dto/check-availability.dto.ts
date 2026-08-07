import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

/**
 * Body for POST /dresses/:id/check-availability.
 * The dress id is taken from the route param, not the body.
 */
export class CheckAvailabilityDto {
  @ApiProperty({ example: 'M', description: 'Requested size label' })
  @IsString()
  size!: string;

  @ApiProperty({ example: '2026-08-15', description: 'Rental start (ISO date)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-08-17', description: 'Rental end (ISO date)' })
  @IsDateString()
  endDate!: string;
}
