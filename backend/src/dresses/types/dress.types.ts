/**
 * Shared backend types for the dresses feature.
 * Enums are re-exported from the generated Prisma client so there is a single
 * source of truth for condition/source values across the codebase.
 */
export {
  DressCondition,
  DressSource,
  DressLength,
  SleeveLength,
} from '@prisma/client';

/** A contiguous, inclusive range of dates the dress cannot be rented. */
export interface UnavailableDateRange {
  start: Date;
  end: Date;
}

/** Result of an availability check for a given size + date range. */
export interface AvailabilityResult {
  available: boolean;
}
