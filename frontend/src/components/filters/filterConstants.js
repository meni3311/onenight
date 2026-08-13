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

/* Letter sizes only — numeric sizes are intentionally omitted from the filter UI.
   "אחר" is included since dresses can be listed under that size too (see
   SIZES in lib/data.js — the two lists are separate on purpose, not a
   duplication: this one deliberately excludes numeric sizes). */
export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "אחר"];

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
  dressLengths: [],
  sleeveLengths: [],
  source: "all",
};

/* Number of filters the user has actively changed from their defaults. */
export function activeFilterCount(f) {
  return (
    f.regions.length +
    f.sizes.length +
    f.colors.length +
    f.dressLengths.length +
    f.sleeveLengths.length +
    (f.source !== "all" ? 1 : 0) +
    (f.q ? 1 : 0) +
    (f.minPrice > PRICE.min || f.maxPrice < PRICE.max ? 1 : 0)
  );
}
