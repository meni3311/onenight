/* ============================================================
   Constants, seed data, and small helpers (Hebrew RTL)
   ============================================================ */

export const REGIONS = ["צפון","חיפה והכרמל","מרכז","גוש דן","ירושלים","דרום","שומרון ויהודה"];
export const SIZES = ["XS","S","M","L","XL","XXL","34","36","38","40","42","44","46","48","50","52","אחר"];
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
