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

/**
 * Body for PATCH /dresses/:id — the owner's inline edit form in AccountPage.
 *
 * Every field is optional (partial update). Deliberately excluded:
 *   - `email`  — reassigning ownership isn't an edit operation
 *   - `status` — admin-only, via PATCH /dresses/:id/status
 * With ValidationPipe's `forbidNonWhitelisted`, sending either is a 400
 * rather than a silent no-op.
 */
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

  /**
   * Replaces the whole size set when present. Same shape rules as create —
   * see CreateDressDto.sizes for why this isn't whitelisted against a fixed
   * list. Omitting it leaves the stored sizes untouched; sending an empty
   * array is rejected, because a listing with no size is not a listing.
   */
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

  /**
   * Only meaningful for bridesmaid listings. On a partial update the service
   * resolves the EFFECTIVE category first — the incoming one if this payload
   * carries it, otherwise the row's stored one — so an edit that only touches
   * the title can't null out a bridesmaid listing's count. See
   * resolveBridesmaidSetCount.
   */
  @ApiPropertyOptional({ minimum: BRIDESMAID_SET_MIN, maximum: BRIDESMAID_SET_MAX })
  @IsOptional()
  @IsInt()
  @Min(BRIDESMAID_SET_MIN)
  @Max(BRIDESMAID_SET_MAX)
  bridesmaidSetCount?: number;

  /** Replaces the whole tag set when present. Normalized server-side. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_HASHTAG_LENGTH * 2, { each: true })
  @ArrayMaxSize(MAX_RAW_HASHTAGS)
  hashtags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  /** Replaces the whole image set, in order. Public Storage URLs only. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
