
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

export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SOURCE_OPTIONS = [
  ["all", "הכל"],
  ["תפירה אישית", "תפירה אישית"],
  ["שם חנות", "בוטיק / חנות"],
];

export const DRESS_LENGTH_OPTIONS = ["קצר", "אמצע", "ארוך"];
export const SLEEVE_LENGTH_OPTIONS = ["קצר", "אמצע", "ארוך"];

export const PRICE = { min: 0, max: 1000, step: 10 };

export const EMPTY_FILTERS = {
  q: "",
  colors: [],
  minPrice: PRICE.min,
  maxPrice: PRICE.max,
  regions: [],
  sizes: [],
  categories: [],
  dressLengths: [],
  sleeveLengths: [],
  source: "all",
};

export const PAGE_LIMIT = 24;

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
