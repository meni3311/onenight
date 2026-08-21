import { ApiPropertyOptional } from '@nestjs/swagger';
import { DressCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CATEGORIES } from '../dress-normalize';

export const MAX_PAGE_LIMIT = 48;

export const DEFAULT_PAGE_LIMIT = 24;

export const MAX_IDS = 100;

export const SORT_KEYS = ['price_asc', 'price_desc', 'newest', 'oldest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

const csv = () =>
  Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter((v) => v !== '');
    if (typeof value !== 'string') return undefined;
    const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
  });

export class BrowseDressesDto {
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored. The public list is always approved-only.',
  })
  @IsOptional()
  @IsString()
  status?: string;

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

  @ApiPropertyOptional({ enum: SORT_KEYS })
  @IsOptional()
  @IsIn(SORT_KEYS as unknown as string[])
  sort?: SortKey;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated', enum: CATEGORIES, isArray: true })
  @IsOptional()
  @csv()
  @IsArray()
  @IsIn(CATEGORIES, { each: true })
  categories?: DressCategory[];

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  dressLengths?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  sleeveLengths?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class DressIdsDto {
  @ApiPropertyOptional({ description: 'Comma-separated dress ids', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_IDS)
  ids?: string[];
}
