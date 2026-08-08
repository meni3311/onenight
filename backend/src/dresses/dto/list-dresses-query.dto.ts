import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { DressLength, SleeveLength } from '@prisma/client';

/** Splits a repeated query param or a single comma-separated one into a clean string[]. */
function toArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = raw.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

/**
 * Query params for GET /dresses (browse/filter). Every category is optional;
 * omitted categories are not applied. Within a category, values are OR'd
 * together (`color=red&color=blue` matches red OR blue); across categories
 * the filters are AND'd. There is deliberately no `condition` param — the
 * condition filter was removed from the filter menu (task brief §3), though
 * the underlying `condition` column and its use elsewhere are untouched.
 */
export class ListDressesQueryDto {
  @ApiPropertyOptional({ description: 'Minimum price (₪), inclusive' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price (₪), inclusive' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Colors to match (OR within this list), e.g. colors=אדום,שחור',
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  colors?: string[];

  @ApiPropertyOptional({ enum: DressLength, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(DressLength, { each: true })
  dressLengths?: DressLength[];

  @ApiPropertyOptional({ enum: SleeveLength, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(SleeveLength, { each: true })
  sleeveLengths?: SleeveLength[];
}
