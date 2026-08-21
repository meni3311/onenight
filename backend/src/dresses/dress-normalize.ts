import { BadRequestException } from '@nestjs/common';
import { DressCategory } from '@prisma/client';

export const STANDARD_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  '34', '36', '38', '40', '42', '44', '46', '48', '50', '52',
];

export const MAX_SIZES = 12;

export const MAX_SIZE_LENGTH = 20;

export const MAX_HASHTAGS = 15;

export const MAX_HASHTAG_LENGTH = 30;

export const MAX_RAW_SIZES = MAX_SIZES * 2;
export const MAX_RAW_HASHTAGS = MAX_HASHTAGS * 4;

export const BRIDESMAID_SET_MIN = 2;
export const BRIDESMAID_SET_MAX = 20;

export const CATEGORIES = Object.values(DressCategory);

const STANDARD_BY_FOLD = new Map(
  STANDARD_SIZES.map((s) => [s.toLocaleLowerCase(), s]),
);

export function normalizeSizes(raw: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const cleaned = entry.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    const folded = STANDARD_BY_FOLD.get(cleaned.toLocaleLowerCase()) ?? cleaned;
    const key = folded.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(folded);
  }

  if (out.length === 0) {
    throw new BadRequestException('נא לבחור לפחות מידה אחת');
  }
  if (out.length > MAX_SIZES) {
    throw new BadRequestException(`אפשר לבחור עד ${MAX_SIZES} מידות`);
  }
  return out;
}

export function normalizeHashtags(raw: readonly string[] | undefined): string[] {
  if (!raw?.length) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;

    let tag = entry.trim().replace(/^#+/, '');
    tag = tag.replace(/[,\s]+/g, '-').replace(/^-+|-+$/g, '');
    if (!tag) continue;

    tag = tag.toLocaleLowerCase().slice(0, MAX_HASHTAG_LENGTH).replace(/-+$/, '');
    if (!tag || seen.has(tag)) continue;

    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_HASHTAGS) break;
  }

  return out;
}

export function resolveBridesmaidSetCount(
  category: DressCategory,
  count: number | null | undefined,
): number | null {
  if (category !== DressCategory.bridesmaid) return null;

  if (count === null || count === undefined) {
    throw new BadRequestException('נא להזין כמה שמלות יש בסט השושבינות');
  }
  if (!Number.isInteger(count) || count < BRIDESMAID_SET_MIN || count > BRIDESMAID_SET_MAX) {
    throw new BadRequestException(
      `מספר השמלות בסט חייב להיות בין ${BRIDESMAID_SET_MIN} ל-${BRIDESMAID_SET_MAX}`,
    );
  }
  return count;
}
