import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DressCategory } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
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
import {
  BRIDESMAID_SET_MAX,
  BRIDESMAID_SET_MIN,
  CATEGORIES,
  MAX_HASHTAG_LENGTH,
  MAX_RAW_HASHTAGS,
  MAX_RAW_SIZES,
  MAX_SIZE_LENGTH,
} from '../dress-normalize';

export const CONDITIONS = ['חדשה', 'כמו חדשה', 'טובה מאוד', 'טובה', 'סבירה'];
export const SOURCES = ['תפירה אישית', 'שם חנות'];
export const LENGTHS = ['קצר', 'אמצע', 'ארוך'];

export class CreateDressDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) desc?: string;

  @ApiProperty() @IsNumber() @IsPositive() price!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() fabric?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() designer?: string;

  @ApiProperty({ enum: SOURCES }) @IsIn(SOURCES) source!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() store?: string;

  @ApiProperty({ enum: CONDITIONS }) @IsIn(CONDITIONS) condition!: string;

  @ApiProperty({ enum: LENGTHS }) @IsIn(LENGTHS) dressLength!: string;

  @ApiProperty({ enum: LENGTHS }) @IsIn(LENGTHS) sleeveLength!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;

  @ApiProperty({ type: [String], description: 'Standard sizes and/or free-text ones' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(MAX_SIZE_LENGTH, { each: true })
  @ArrayMaxSize(MAX_RAW_SIZES)
  sizes!: string[];

  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category!: DressCategory;

  @ApiPropertyOptional({ minimum: BRIDESMAID_SET_MIN, maximum: BRIDESMAID_SET_MAX })
  @IsOptional()
  @IsInt()
  @Min(BRIDESMAID_SET_MIN)
  @Max(BRIDESMAID_SET_MAX)
  bridesmaidSetCount?: number;

  @ApiPropertyOptional({ type: [String], description: 'With or without a leading #' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_HASHTAG_LENGTH * 2, { each: true })
  @ArrayMaxSize(MAX_RAW_HASHTAGS)
  hashtags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiProperty() @IsEmail() email!: string;

  @ApiPropertyOptional({ type: [String], description: 'Public image URLs, in display order' })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
