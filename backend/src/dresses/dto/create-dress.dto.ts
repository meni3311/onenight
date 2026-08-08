import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  DressCondition,
  DressLength,
  DressSource,
  SleeveLength,
} from '@prisma/client';

/**
 * Body for POST /dresses (publish a new listing).
 *
 * Scoped to the Dress model's own scalar fields plus its size/image
 * relations — auth (deriving `ownerId` from the logged-in session) and the
 * listing-approval flow are separate, pre-existing concerns and untouched
 * here, so `ownerId` is accepted as a plain field for now.
 */
export class CreateDressDto {
  @ApiProperty() @IsString() name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty() @IsNumber() @IsPositive() price!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() fabric?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() length?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() designer?: string;

  @ApiProperty({ enum: DressSource }) @IsEnum(DressSource) source!: DressSource;

  @ApiProperty({ enum: DressCondition })
  @IsEnum(DressCondition)
  condition!: DressCondition;

  /** Dress length — short / medium / long. Required (see task brief §4–6). */
  @ApiProperty({ enum: DressLength })
  @IsEnum(DressLength)
  dressLength!: DressLength;

  /** Sleeve length — short / medium / long. Required (see task brief §4–6). */
  @ApiProperty({ enum: SleeveLength })
  @IsEnum(SleeveLength)
  sleeveLength!: SleeveLength;

  @ApiProperty() @IsUUID() ownerId!: string;

  @ApiPropertyOptional({ type: [String], description: 'Size labels, e.g. ["S","M"]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Image URLs, in display order' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  images?: string[];
}
