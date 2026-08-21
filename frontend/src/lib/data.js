/* ============================================================
   Constants, seed data, and small helpers (Hebrew RTL)
   ============================================================ */

export const REGIONS = ["צפון","חיפה והכרמל","מרכז","גוש דן","ירושלים","דרום","שומרון ויהודה"];
/* The sizes the publish form offers as chips. Mirrors STANDARD_SIZES in
   backend/src/dresses/dress-normalize.ts — keep the two in sync.

   "אחר" is deliberately NOT in this list. It is a UI affordance, never a
   storable value — a dress listed at size "אחר" would tell a renter nothing.
   Selecting it reveals a free-text field, and what gets stored is whatever
   was typed there. See SizeMultiSelect.jsx. */
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
  /* The stored enum member is still `bridesmaid` — only the label changed
     (was "שושבינה"). Nothing keyed on the value moves: browse URLs stay
     ?categories=bridesmaid, the DressCategory enum in Postgres is untouched,
     and every `d.category === "bridesmaid"` branch keeps working. This split
     is exactly what it's for. */
  { value: "bridesmaid", label: "סט שמלות" },
  { value: "evening",    label: "ערב" },
  { value: "plus_size",  label: "מידות גדולות" },
];

/* value → label, for the card badge / detail page / admin row — all of which
   hold a stored category and just need something to render. */
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export const CONDITIONS = ["חדשה","כמו חדשה","טובה מאוד","טובה","סבירה"];
/* Structured filter categories: dress length + sleeve length. Single source
   of truth for both facets. */
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

/* NO SEED DATA, NO LOCAL CACHE, NO OFFLINE FALLBACK. Dresses are read from
   and written to Postgres through the API in lib/api.js, so an empty
   catalogue means the database is genuinely empty — the truth we want,
   rather than fake listings papering over it.

   Do not add a generic localStorage helper here. Components that need local
   UI state use hooks/useLocalStorage.js, which is scoped to preferences
   (favourites, the signed-in user) — never listing data. */

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
