import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DressCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from './browse-dresses.dto';
import { CATEGORIES } from '../dress-normalize';

export class AdminListDressesDto {
  @ApiPropertyOptional({
    enum: ['pending', 'approved', 'rejected', 'all'],
    default: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'all'])
  status?: string;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: DressCategory;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_LIMIT, default: DEFAULT_PAGE_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

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

export class ToggleBookedDateDto {
  @ApiProperty({ example: '2026-08-14', description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'key must be YYYY-MM-DD' })
  key!: string;
}
