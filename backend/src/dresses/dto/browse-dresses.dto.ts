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

/**
 * Hard ceiling on page size. The client picks `limit`, so this is what stops
 * `?limit=99999` from being a rename of the unpaginated endpoint we are
 * removing. Sits a little above the grid's own page size so a caller can ask
 * for a denser page without being able to ask for the catalogue.
 */
export const MAX_PAGE_LIMIT = 48;

/** What the grid requests when it doesn't say — two rows of four, twice over. */
export const DEFAULT_PAGE_LIMIT = 24;

/** Ceiling on how many ids the favourites lookup will resolve in one call. */
export const MAX_IDS = 100;

/** Sort keys, matching SORT_OPTIONS in the frontend's SortMenu.jsx. */
export const SORT_KEYS = ['price_asc', 'price_desc', 'newest', 'oldest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/**
 * Multi-select facets arrive comma-separated (`?colors=לבן,שחור`) rather than
 * as repeated keys. Repeated keys are the other convention, but Express only
 * produces an array when a key actually appears twice — a single value comes
 * through as a bare string — so every consumer would need to normalize anyway.
 * CSV also gives the browse cache a stable key without sorting query params.
 *
 * Empty segments are dropped so a trailing comma or an empty param is the same
 * as not filtering on that facet at all, rather than a filter for "".
 */
const csv = () =>
  Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter((v) => v !== '');
    if (typeof value !== 'string') return undefined;
    const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
  });

/**
 * Query for the public browse list — `GET /api/dresses`.
 *
 * Every browse facet is expressed here, because the client receives nothing
 * to filter locally: the endpoint returns one approved page.
 */
export class BrowseDressesDto {
  /**
   * DELIBERATELY ACCEPTED AND DELIBERATELY IGNORED.
   *
   * The public list is approved-only with no way to ask otherwise; the admin
   * queue lives behind AdminGuard at `GET /api/admin/dresses`.
   *
   * The field stays declared because the global ValidationPipe runs with
   * `forbidNonWhitelisted`, so an undeclared `status` would 400. A cached copy
   * of the old frontend bundle still sending `?status=all` should quietly get
   * the approved page, not a broken homepage. Nothing reads this value.
   *
   * @deprecated ignored — remove once no deployed client sends it.
   */
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

  /** Free-text search over title / desc / color / region. */
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

  /**
   * Matches a dress if ANY of its sizes is in this list — a dress that fits
   * both S and M belongs in a search for either.
   *
   * Values are deliberately NOT whitelisted. The standard sizes arrive from
   * the filter chips, but the panel's "אחר" option reveals a free-text field,
   * so an arbitrary string is a legitimate value here and is matched exactly
   * against the stored (already normalized) sizes. That field is also what
   * finally lets a visitor filter for a numeric size — the chip list is
   * letters only by design, see LETTER_SIZES in the frontend's
   * filterConstants.js.
   */
  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  /**
   * Occasion facet, multi-select like colours and sizes. Whitelisted against
   * the enum, unlike the free-text facets — an unknown category is a typo or
   * a stale link, not a search term.
   *
   * The homepage's category tiles link here with a single value.
   */
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

  /** "all" (or omitted) means no source filter, matching SOURCE_OPTIONS. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * Query for `GET /api/dresses/by-ids` — the favourites page resolving the ids
 * it keeps in localStorage.
 *
 * Capped at MAX_IDS so this can't be walked into a full-catalogue dump by
 * anyone willing to guess uuids, and because a favourites list longer than
 * that isn't a real one.
 */
export class DressIdsDto {
  @ApiPropertyOptional({ description: 'Comma-separated dress ids', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_IDS)
  ids?: string[];
}
