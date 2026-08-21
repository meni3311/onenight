
export const REGIONS = ["צפון","חיפה והכרמל","מרכז","גוש דן","ירושלים","דרום","שומרון ויהודה"];
export const SIZES = ["XS","S","M","L","XL","XXL","34","36","38","40","42","44","46","48","50","52"];

export const OTHER_SIZE = "אחר";

export const CATEGORIES = [
  { value: "bridal",     label: "כלה" },
  { value: "bridesmaid", label: "סט שמלות" },
  { value: "evening",    label: "ערב" },
  { value: "plus_size",  label: "מידות גדולות" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export const CONDITIONS = ["חדשה","כמו חדשה","טובה מאוד","טובה","סבירה"];
export const DRESS_LENGTHS = ["קצר","אמצע","ארוך"];
export const SLEEVE_LENGTHS = ["קצר","אמצע","ארוך"];

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

const LEGACY_DRESS_KEYS = ["onenight_dresses", "onenight_users"];

export function purgeLegacyDressStorage() {
  try {
    for (const key of LEGACY_DRESS_KEYS) localStorage.removeItem(key);
  } catch {
  }
}
