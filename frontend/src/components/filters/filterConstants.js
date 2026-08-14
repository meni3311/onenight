/* Filter domain constants + the empty-filter shape and active-count helper. */

/* Curated color swatches (name → hex) for the filter + chips.
   `name` is the matchable value (matches d.color in data). */
export const COLOR_SWATCHES = [
  { name: "לבן", hex: "#FFFFFF" },
  { name: "שחור", hex: "#2A2A2A" },
  { name: "אדום", hex: "#B23A48" },
  { name: "ורוד", hex: "#E8457A" },
  { name: "תכלת", hex: "#26365E" },
  { name: "זהב", hex: "#C9A86A" },
  { name: "שמפניה", hex: "#E2D2B8" },
  { name: "ירוק", hex: "#3E5A48" },
  { name: "כסף", hex: "#C8C8CC" },
  { name: "סגול", hex: "#5E4B79" },
];

/* Letter sizes only — numeric sizes are intentionally omitted from the filter
   UI (see SIZES in lib/data.js — the two lists are separate on purpose, not a
   duplication).

   "אחר" used to be in this list as a matchable value, because a dress could
   literally be listed at size "אחר". It is not a value any more: SizeMultiSelect
   renders it as a chip that reveals a free-text box, and whatever that box
   produces joins `f.sizes` alongside the letters, matched exactly against the
   dress's own sizes. That box is also what finally lets someone filter for a
   numeric size — which this list still deliberately doesn't offer as a chip. */
export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/* Source filter options: [value, label]. "הכל" (all) is the default. */
export const SOURCE_OPTIONS = [
  ["all", "הכל"],
  ["תפירה אישית", "תפירה אישית"],
  ["שם חנות", "בוטיק / חנות"],
];

/* Dress-length / sleeve-length filter options (short / medium / long). */
export const DRESS_LENGTH_OPTIONS = ["קצר", "אמצע", "ארוך"];
export const SLEEVE_LENGTH_OPTIONS = ["קצר", "אמצע", "ארוך"];

/* Price slider bounds (₪) — single draggable range slider, 0 to 1000. */
export const PRICE = { min: 0, max: 1000, step: 10 };

export const EMPTY_FILTERS = {
  q: "",
  colors: [],
  minPrice: PRICE.min,
  maxPrice: PRICE.max,
  regions: [],
  sizes: [],
  /* Multi-select like colours and sizes, not single-select like `source`.
     The homepage's category tiles will just set one value here. */
  categories: [],
  dressLengths: [],
  sleeveLengths: [],
  source: "all",
};

/* How many dresses one page of the gallery holds. Must not exceed
   MAX_PAGE_LIMIT in the backend's browse-dresses.dto.ts, which rejects
   anything larger; it's also the only page size the server will cache, so
   changing it here without changing it there silently costs every cache hit. */
export const PAGE_LIMIT = 24;

/* Serialize the filter state into the browse endpoint's query string.

   Anything still at its default is deliberately OMITTED rather than sent
   explicitly. That isn't cosmetic: the server only caches requests that carry
   no filter params at all (see browseCacheKey in dresses.service.ts), so
   sending `minPrice=0&maxPrice=1000` on the homepage's first load — which is
   what the untouched slider holds — would look like a filtered query and miss
   the cache on the one request every visitor makes.

   Multi-selects go over as comma-separated values, matching the DTO. */
export function filtersToQuery(f, sort, page, limit = PAGE_LIMIT) {
  const p = new URLSearchParams();

  if (f.q) p.set("q", f.q);
  if (f.colors.length) p.set("colors", f.colors.join(","));
  if (f.sizes.length) p.set("sizes", f.sizes.join(","));
  if (f.categories.length) p.set("categories", f.categories.join(","));
  if (f.regions.length) p.set("regions", f.regions.join(","));
  if (f.dressLengths.length) p.set("dressLengths", f.dressLengths.join(","));
  if (f.sleeveLengths.length) p.set("sleeveLengths", f.sleeveLengths.join(","));
  if (f.source !== "all") p.set("source", f.source);
  if (f.minPrice > PRICE.min) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice < PRICE.max) p.set("maxPrice", String(f.maxPrice));
  if (sort) p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  if (limit !== PAGE_LIMIT) p.set("limit", String(limit));

  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

/* Number of filters the user has actively changed from their defaults. */
export function activeFilterCount(f) {
  return (
    f.regions.length +
    f.sizes.length +
    f.categories.length +
    f.colors.length +
    f.dressLengths.length +
    f.sleeveLengths.length +
    (f.source !== "all" ? 1 : 0) +
    (f.q ? 1 : 0) +
    (f.minPrice > PRICE.min || f.maxPrice < PRICE.max ? 1 : 0)
  );
}
