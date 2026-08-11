import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { CONDITIONS, LENGTHS, SOURCES } from './create-dress.dto';

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

  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  /** Replaces the whole image set, in order. Public Storage URLs only. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
