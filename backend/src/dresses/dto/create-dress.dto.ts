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

/**
 * Allowed values for the four free-text option columns. These mirror
 * frontend/src/lib/data.js exactly — that file is the source of truth for what
 * the form offers, and these columns have no DB-level constraint (they stopped
 * being enums when the dress flow moved off the localStorage mock), so this
 * DTO is the only thing keeping junk out. Update both together.
 */
export const CONDITIONS = ['חדשה', 'כמו חדשה', 'טובה מאוד', 'טובה', 'סבירה'];
export const SOURCES = ['תפירה אישית', 'שם חנות'];
export const LENGTHS = ['קצר', 'אמצע', 'ארוך'];

/**
 * Body for POST /dresses. Field names match the publish form one-for-one so
 * the frontend can post its form state as-is.
 *
 * `ownerId` is deliberately absent: it's resolved server-side from `email`
 * (see DressesService.createDress) so a client can't claim someone else's
 * listing by guessing a uuid. `status` is not accepted either — new listings
 * always start "pending" and only the admin endpoint moves them.
 */
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

  /**
   * Every size this listing fits. Replaced a single `size` string.
   *
   * NOT checked against a fixed list, unlike `source` / `condition` / the two
   * lengths above. The publish form offers the standard sizes as chips plus
   * an "אחר" option that reveals a free-text field, so "מידה אחת" or
   * "38 ארוך" are legitimate values a whitelist would reject. What is
   * validated here is shape — string, non-empty array, per-entry length —
   * and normalizeSizes() takes it from there (comma stripping, case folding
   * onto the standard spellings, dedupe, count cap).
   *
   * The bound is MAX_RAW_SIZES rather than MAX_SIZES on purpose; see the
   * comment on those constants.
   */
  @ApiProperty({ type: [String], description: 'Standard sizes and/or free-text ones' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(MAX_SIZE_LENGTH, { each: true })
  @ArrayMaxSize(MAX_RAW_SIZES)
  sizes!: string[];

  /** The occasion this listing is for. See the DressCategory enum. */
  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category!: DressCategory;

  /**
   * Dresses in the set. Only accepted for `category: 'bridesmaid'` — for any
   * other category the service forces it to null rather than rejecting it,
   * since a leftover value is the form's residue after a category switch and
   * not something the lister can still see. Required when the category IS
   * bridesmaid; that check lives in resolveBridesmaidSetCount, because it
   * depends on another field and class-validator would need a custom
   * validator to express it.
   */
  @ApiPropertyOptional({ minimum: BRIDESMAID_SET_MIN, maximum: BRIDESMAID_SET_MAX })
  @IsOptional()
  @IsInt()
  @Min(BRIDESMAID_SET_MIN)
  @Max(BRIDESMAID_SET_MAX)
  bridesmaidSetCount?: number;

  /**
   * Free-text discovery tags. No fixed vocabulary — autocomplete is a later
   * feature. Sent with or without a leading "#"; normalizeHashtags() strips
   * it, lowercases, hyphenates whitespace, dedupes and caps the count.
   */
  @ApiPropertyOptional({ type: [String], description: 'With or without a leading #' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(MAX_HASHTAG_LENGTH * 2, { each: true })
  @ArrayMaxSize(MAX_RAW_HASHTAGS)
  hashtags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  /** Resolves the owner. Must match a registered user's email. */
  @ApiProperty() @IsEmail() email!: string;

  /**
   * Public Cloudflare R2 URLs produced by POST /dresses/images. `IsUrl`
   * rejects the base64 data: URLs the old mock used to store, which is the
   * point — image bytes must never come through this endpoint again.
   */
  @ApiPropertyOptional({ type: [String], description: 'Public image URLs, in display order' })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
