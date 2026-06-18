/* ============================================================
   Design tokens — single source of truth for hardcoded values.
   Reference these instead of inlining raw hex / rgba / font strings.
   Tailwind's own palette lives in index.html; this file covers the
   computed / dynamic styles that can't be expressed as static classes.
   ============================================================ */

/* ---------- Brand & surface colors ---------- */
export const COLORS = {
  rose: "#C4A0A0",
  bordeaux: "#6B2D2D",
  dark: "#2A1F1F",
  cream: "#FAF6F1",

  brand: "#8B3A3A",
  brandDark: "#6E2C2C",
  brandLight: "#F0E8E8",
  ink: "#1A1714",

  /* Section eyebrow / muted serif text */
  eyebrow: "#875e5e",

  /* Opaque equivalent of the canvas token rgba(110,44,44,0.08) composited
     over white — the solid end-stop for hero→page blend gradients. */
  siteBg: "#F3EEEE",

  /* Frosted-glass filter panel palette */
  glass: {
    chipActive: "#C9897F",
    chipActiveBorder: "#D9A99F",
    accent: "#E6B9B0",
    ink: "#3A1E1C",
    text: "#F3E9E6",
    textSoft: "#F7ECE9",
  },
};

/* ---------- Translucent ink / white washes (reused across overlays) ---------- */
export const ALPHA = {
  /* #2A1F1F (dark) text tints used in the editorial sections */
  darkText: "rgba(42,31,31,0.75)",
  darkTextSoft: "rgba(42,31,31,0.65)",

  /* hairline dividers / borders on glass */
  glassBorder: "rgba(255,255,255,0.10)",
  roseDivider: "rgba(196,160,160,0.2)",
};

/* ---------- Font stacks (Latin display + Hebrew fallbacks) ---------- */
export const FONTS = {
  assistant: "'Assistant', system-ui, sans-serif",
  serif: "'Cormorant Garamond', 'Playfair Display', 'Frank Ruhl Libre', serif",
  jost: "'Jost','Assistant',system-ui,sans-serif",
};

/* ---------- Motion ---------- */
/* Soft luxury ease used for framer-motion / CSS cubic-beziers */
export const EASE_LUX = [0.16, 1, 0.3, 1];

/* ---------- Default color the publish form stamps onto new dresses ---------- */
export const DEFAULT_DRESS_COLOR_HEX = COLORS.rose;
