import { COLORS, FONTS } from "../../constants/theme.js";

/* Pill toggle — translucent when unselected, warm rose-glass when selected. */
export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: FONTS.jost,
        fontSize: "13px",
        backgroundColor: active ? COLORS.glass.chipActive : "rgba(255,255,255,0.07)",
        border: active ? `1px solid ${COLORS.glass.chipActiveBorder}` : "1px solid rgba(255,255,255,0.18)",
        color: active ? COLORS.glass.ink : COLORS.glass.text,
      }}
      className="rounded-full px-4 py-2 transition-all duration-200 ease-lux focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0]"
    >
      {children}
    </button>
  );
}
