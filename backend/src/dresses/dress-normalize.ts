import { BadRequestException } from '@nestjs/common';
import { DressCategory } from '@prisma/client';

/**
 * Write-side normalization for the three free-shaped Dress fields: `sizes`,
 * `hashtags`, and the bridesmaid-only `bridesmaidSetCount`.
 *
 * These run on create and on update, on values that have already passed the
 * DTO's per-entry shape checks (type, length, array bounds). The split is
 * deliberate: class-validator is good at "is this entry a string of at most
 * 20 characters" and bad at "does this array, taken as a whole, still make
 * sense after trimming and deduping". So the DTO rejects malformed entries
 * and this file decides what the row actually stores.
 *
 * The frontend mirrors the two normalizers in frontend/src/lib/normalize.js
 * so a lister sees the same chip they'll get back from the server. That copy
 * is a UX nicety and nothing more — it is never trusted, and every write goes
 * through the functions here regardless of what the client sent. Keep the two
 * in sync; the frontend file carries a pointer back to this one.
 */

/**
 * The sizes the publish form and the browse filter offer as chips.
 *
 * Mirrors SIZES in frontend/src/lib/data.js. Note what is NOT here: "אחר".
 * That used to be a storable value in its own right — a dress could literally
 * have the size "אחר" — and it is now purely a UI affordance that reveals a
 * free-text field. What gets stored is whatever the lister typed into that
 * field, never the word "אחר" itself.
 *
 * This list is used for case-folding, not for validation. A size does not
 * have to appear here to be accepted.
 */
export const STANDARD_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  '34', '36', '38', '40', '42', '44', '46', '48', '50', '52',
];

/** Ceiling on sizes per listing, enforced after normalization. */
export const MAX_SIZES = 12;

/** Ceiling on one size's length, enforced per-entry by the DTO. */
export const MAX_SIZE_LENGTH = 20;

/** Ceiling on tags per listing. Over this, the tail is dropped, not rejected. */
export const MAX_HASHTAGS = 15;

/** Ceiling on one tag's length. Longer tags are truncated, not rejected. */
export const MAX_HASHTAG_LENGTH = 30;

/**
 * Pre-normalization array bounds, enforced by the DTO.
 *
 * Deliberately looser than MAX_SIZES / MAX_HASHTAGS, which apply *after*
 * trimming and deduping. Validating the raw array against the real cap would
 * reject a payload that normalizes down to a legal one — fourteen sizes that
 * dedupe to nine, say. These are the abuse guard; the real caps are the rule.
 */
export const MAX_RAW_SIZES = MAX_SIZES * 2;
export const MAX_RAW_HASHTAGS = MAX_HASHTAGS * 4;

/** A bridesmaid set of one is a dress; the upper bound is an abuse guard. */
export const BRIDESMAID_SET_MIN = 2;
export const BRIDESMAID_SET_MAX = 20;

/** Every enum member, straight from the generated client so it can't drift. */
export const CATEGORIES = Object.values(DressCategory);

/** Case-insensitive spelling → the canonical one from STANDARD_SIZES. */
const STANDARD_BY_FOLD = new Map(
  STANDARD_SIZES.map((s) => [s.toLocaleLowerCase(), s]),
);

/**
 * Clean up one listing's sizes.
 *
 * Per entry: commas become spaces, runs of whitespace collapse to one, and
 * the result is trimmed. Empty entries are dropped.
 *
 * COMMAS ARE STRIPPED RATHER THAN ESCAPED because this facet is serialized
 * as a comma-separated query param (`?sizes=XS,S,40` — see the csv()
 * transform in browse-dresses.dto.ts). A stored size containing a comma
 * would split into two junk filter terms on the way back, silently.
 *
 * Entries that match a standard size case-insensitively are folded onto its
 * canonical spelling: a lister typing `xl` into the free-text field would
 * otherwise create a value that the `XL` filter chip can never match — two
 * sizes indistinguishable to a human and invisible to each other. Folding
 * happens after whitespace cleanup so " xl " lands on "XL" too.
 *
 * Deduping is likewise case-insensitive, so selecting the XL chip *and*
 * typing `xl` yields one entry, not two.
 *
 * @throws BadRequestException if nothing survives, or if too many do.
 */
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
  // Unlike hashtags below, an over-long size list is rejected rather than
  // truncated: silently dropping a size the lister chose would misrepresent
  // what the dress actually fits.
  if (out.length > MAX_SIZES) {
    throw new BadRequestException(`אפשר לבחור עד ${MAX_SIZES} מידות`);
  }
  return out;
}

/**
 * Clean up one listing's hashtags.
 *
 * Per tag: trim, drop any leading "#" the lister typed (tags are stored bare
 * and the "#" is re-added for display), turn commas and whitespace into
 * single hyphens so a multi-word tag stays one token, strip hyphens from the
 * ends, lowercase, and truncate to MAX_HASHTAG_LENGTH.
 *
 * Lowercasing is for matching, not aesthetics: `#Summer` and `#summer` are
 * the same tag to everyone except a database. It is a no-op on Hebrew, which
 * has no case, so it only affects Latin tags.
 *
 * Duplicates are dropped keeping first-seen order, and the list is capped by
 * truncation rather than rejection — the cap exists to keep the field from
 * growing unbounded, and refusing a whole listing over a sixteenth
 * decorative tag would be a poor trade.
 */
export function normalizeHashtags(raw: readonly string[] | undefined): string[] {
  if (!raw?.length) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;

    let tag = entry.trim().replace(/^#+/, '');
    tag = tag.replace(/[,\s]+/g, '-').replace(/^-+|-+$/g, '');
    if (!tag) continue;

    // Truncate first, then re-trim: slicing can leave a dangling hyphen.
    tag = tag.toLocaleLowerCase().slice(0, MAX_HASHTAG_LENGTH).replace(/-+$/, '');
    if (!tag || seen.has(tag)) continue;

    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_HASHTAGS) break;
  }

  return out;
}

/**
 * Decide what `bridesmaidSetCount` should actually be stored as.
 *
 * The field is only meaningful for bridesmaid listings, so this is the one
 * place that rule is enforced — required when the category is `bridesmaid`,
 * forced to null for every other category. Forcing rather than rejecting a
 * stray count on a non-bridesmaid listing keeps a category switch from
 * failing on a value the lister can no longer see: the publish and edit forms
 * hide the input the moment the category changes, so a leftover in the
 * payload is the form's residue, not a user's intent.
 *
 * `category` is the EFFECTIVE category — on a partial update that means the
 * incoming one if the payload carries it, otherwise the stored one. Passing
 * the payload's category alone would let an edit that only touches the title
 * null out a bridesmaid listing's count.
 *
 * @throws BadRequestException if a bridesmaid listing has no usable count.
 */
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
