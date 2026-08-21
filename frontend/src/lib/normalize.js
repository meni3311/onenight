/* ============================================================
   Client-side mirror of backend/src/dresses/dress-normalize.ts.

   THIS IS A UX NICETY, NOT VALIDATION. It exists so a lister sees the same
   chip the server will hand back — type "#Summer Wedding", get "summer-wedding"
   immediately rather than after a round trip. Every write is re-normalized
   server-side regardless of what this produced, because the form is not the
   only thing that can POST to the API.

   Keep in sync with the backend file, which carries a pointer back to here.
   ============================================================ */

import { SIZES } from "./data.js";

export const MAX_SIZES = 12;
export const MAX_HASHTAGS = 15;
export const MAX_HASHTAG_LENGTH = 30;

/* Case-insensitive spelling → the canonical one from SIZES. */
const STANDARD_BY_FOLD = new Map(SIZES.map((s) => [s.toLocaleLowerCase(), s]));

/* One free-text size, cleaned up.

   Commas become spaces rather than being kept: the browse filter serializes
   sizes as a comma-separated query param, so a comma inside a value would
   split into two junk terms on the way back.

   Folding onto a standard spelling is the point of the `STANDARD_BY_FOLD`
   lookup — someone typing "xl" into the Other field would otherwise create a
   size the XL chip can never match. */
export function normalizeSize(raw) {
  const cleaned = String(raw || "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return STANDARD_BY_FOLD.get(cleaned.toLocaleLowerCase()) || cleaned;
}

/* A whole size array: normalize each, drop empties, dedupe case-insensitively
   (so picking the XL chip *and* typing "xl" yields one entry, not two). */
export function normalizeSizes(raw) {
  const out = [];
  const seen = new Set();
  for (const entry of raw || []) {
    const size = normalizeSize(entry);
    if (!size) continue;
    const key = size.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(size);
  }
  return out;
}

/* One hashtag: drop any leading "#" (tags are stored bare and the "#" is
   re-added for display), turn commas and whitespace into single hyphens so a
   multi-word tag stays one token, trim hyphens off the ends, lowercase, and
   truncate. Lowercasing is for matching, not looks — "#Summer" and "#summer"
   are the same tag to everyone except a database. No-op on Hebrew. */
export function normalizeHashtag(raw) {
  let tag = String(raw || "").trim().replace(/^#+/, "");
  tag = tag.replace(/[,\s]+/g, "-").replace(/^-+|-+$/g, "");
  if (!tag) return "";
  return tag.toLocaleLowerCase().slice(0, MAX_HASHTAG_LENGTH).replace(/-+$/, "");
}

/* A whole tag array: normalize each, drop empties, dedupe keeping first-seen
   order, cap by truncation. */
export function normalizeHashtags(raw) {
  const out = [];
  const seen = new Set();
  for (const entry of raw || []) {
    const tag = normalizeHashtag(entry);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_HASHTAGS) break;
  }
  return out;
}
