import { ApiPropertyOptional } from '@nestjs/swagger';
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
 * Every filter the homepage applied in the browser (App.jsx's `visible`/
 * `sorted` memos) is expressed here instead, because the client no longer
 * receives anything to filter: the endpoint returns one approved page.
 */
export class BrowseDressesDto {
  /**
   * DELIBERATELY ACCEPTED AND DELIBERATELY IGNORED.
   *
   * This endpoint used to take `?status=` and the frontend called it with
   * `all`, which shipped the entire moderation queue — pending and rejected
   * listings, with their owners' phone numbers — to every anonymous visitor.
   * The public list is now approved-only with no way to ask otherwise; the
   * admin queue lives behind AdminGuard at `GET /api/admin/dresses`.
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

  @ApiPropertyOptional({ description: 'Comma-separated', type: String })
  @IsOptional()
  @csv()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

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
