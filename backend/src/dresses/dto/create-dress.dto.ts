import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

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

  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  /** Resolves the owner. Must match a registered user's email. */
  @ApiProperty() @IsEmail() email!: string;

  /**
   * Public Supabase Storage URLs produced by POST /dresses/images. `IsUrl`
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
