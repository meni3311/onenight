/* ============================================================
   Constants, seed data, and small helpers (Hebrew RTL)
   ============================================================ */

export const REGIONS = ["צפון","חיפה והכרמל","מרכז","גוש דן","ירושלים","דרום","שומרון ויהודה"];
/* The sizes the publish form offers as chips. Mirrors STANDARD_SIZES in
   backend/src/dresses/dress-normalize.ts — keep the two in sync.

   NOTE WHAT IS NO LONGER HERE: "אחר". It used to be a storable value, so a
   dress could literally be listed at size "אחר", which told a renter nothing.
   It is a UI affordance now — selecting it reveals a free-text field, and what
   gets stored is whatever was typed there. See SizeMultiSelect.jsx. */
export const SIZES = ["XS","S","M","L","XL","XXL","34","36","38","40","42","44","46","48","50","52"];

/* Label for the chip that reveals the free-text size field. Never a value. */
export const OTHER_SIZE = "אחר";

/* Occasion categories. `value` is the DressCategory enum member stored in
   Postgres and carried in browse URLs (?categories=bridal); `label` is the
   only part a visitor ever reads.

   The split keeps copy edits in this file: renaming "מידות גדולות" is one
   line here and touches neither the database nor any existing link. Mirrors
   the DressCategory enum in backend/prisma/schema.prisma. */
export const CATEGORIES = [
  { value: "bridal",     label: "כלה" },
  { value: "bridesmaid", label: "שושבינה" },
  { value: "evening",    label: "ערב" },
  { value: "plus_size",  label: "מידות גדולות" },
];

/* value → label, for the card badge / detail page / admin row — all of which
   hold a stored category and just need something to render. */
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export const CONDITIONS = ["חדשה","כמו חדשה","טובה מאוד","טובה","סבירה"];
/* Structured filter categories: dress length + sleeve length. The old
   free-form `LENGTHS`/`length` field that used to duplicate `DRESS_LENGTHS`
   has been removed — this is now the single source of truth. */
export const DRESS_LENGTHS = ["קצר","אמצע","ארוך"];
export const SLEEVE_LENGTHS = ["קצר","אמצע","ארוך"];

/* ---------- Soft SVG placeholder (always works offline) ---------- */
export function placeholder(color, label){
  const safe = (label||"onenight").slice(0,18);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'>
    <rect width='300' height='400' fill='#FFFFFF'/>
    <rect x='0' y='0' width='300' height='400' fill='${color}' opacity='0.14'/>
    <path d='M150 70 l30 60 -18 0 28 150 -80 0 28 -150 -18 0 z' fill='${color}' opacity='0.5'/>
    <circle cx='150' cy='58' r='14' fill='${color}' opacity='0.5'/>
    <text x='150' y='370' font-family='Cormorant Garamond, serif' font-size='20' fill='#8C7B7B' text-anchor='middle'>${safe}</text>
  </svg>`;
  return "data:image/svg+xml;utf8,"+encodeURIComponent(svg);
}

/* ---------- Retired: seed dresses + localStorage helpers ----------
   The 8 hardcoded demo listings (Unsplash photos, fake 052… numbers,
   a@x.com-style emails) and the `LS` get/set helpers that persisted them
   under "onenight_dresses" both lived here.

   Both are gone. Dresses are read from and written to Postgres through the
   API in lib/api.js — there is no seed set, no local cache, and no offline
   fallback. An empty catalogue now means the database is genuinely empty,
   which is the truth we want rather than eight fake dresses papering over
   it. Stale copies left in existing browsers are cleared once by
   purgeLegacyDressStorage() below.

   `LS` is deliberately not re-exported even as a generic utility: keeping it
   around invites exactly the pattern being removed. Components that need
   local UI state use hooks/useLocalStorage.js, which is scoped to
   preferences (favourites, the signed-in user) — never listing data. */

/** localStorage keys written by the old mock API. */
const LEGACY_DRESS_KEYS = ["onenight_dresses", "onenight_users"];

/**
 * One-time cleanup of mock listing data from before the Postgres migration.
 *
 * Anyone who used the app while it was localStorage-backed still has those
 * fake dresses (and mock user records, including plaintext passwords) sitting
 * in their browser. Nothing reads those keys any more, so they're inert — but
 * they're stale personal-ish data we said we'd remove, and leaving them makes
 * "is this real or mock?" ambiguous when debugging. Called once on app start.
 */
export function purgeLegacyDressStorage() {
  try {
    for (const key of LEGACY_DRESS_KEYS) localStorage.removeItem(key);
  } catch {
    // Private mode / storage disabled — nothing to clean up anyway.
  }
}
