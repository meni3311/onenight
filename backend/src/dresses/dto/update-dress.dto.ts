import { ApiPropertyOptional } from '@nestjs/swagger';
import { DressCategory } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CONDITIONS, LENGTHS, SOURCES } from './create-dress.dto';
import {
  BRIDESMAID_SET_MAX,
  BRIDESMAID_SET_MIN,
  CATEGORIES,
  MAX_HASHTAG_LENGTH,
  MAX_RAW_HASHTAGS,
  MAX_RAW_SIZES,
  MAX_SIZE_LENGTH,
} from '../dress-normalize';

export class UpdateDressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) desc?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() price?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() fabric?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() designer?: string;

  @ApiPropertyOptional({ enum: SOURCES }) @IsOptional() @IsIn(SOURCES) source?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() store?: string;

  @ApiPropertyOptional({ enum: CONDITIONS }) @IsOptional() @IsIn(CONDITIONS) condition?: string;

  @ApiPropertyOptional({ enum: LENGTHS }) @IsOptional() @IsIn(LENGTHS) dressLength?: string;

  @ApiPropertyOptional({ enum: LENGTHS }) @IsOptional() @IsIn(LENGTHS) sleeveLength?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(MAX_SIZE_LENGTH, { each: true })
  @ArrayMaxSize(MAX_RAW_SIZES)
  sizes?: string[];

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: DressCategory;

  @ApiPropertyOptional({ minimum: BRIDESMAID_SET_MIN, maximum: BRIDESMAID_SET_MAX })
  @IsOptional()
  @IsInt()
  @Min(BRIDESMAID_SET_MIN)
  @Max(BRIDESMAID_SET_MAX)
  bridesmaidSetCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_HASHTAG_LENGTH * 2, { each: true })
  @ArrayMaxSize(MAX_RAW_HASHTAGS)
  hashtags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
