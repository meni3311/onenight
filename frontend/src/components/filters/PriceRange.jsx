import { COLORS } from "../../constants/theme.js";

export function PriceRange({ min, max, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div
        className="mb-3 text-center"
        style={{
          fontFamily: "'Jost','Assistant',system-ui,sans-serif",
          fontSize: "14px",
          letterSpacing: "0.5px",
          color: COLORS.glass.accent,
        }}
      >
        עד ₪{value}
      </div>
      <input
        type="range"
        className="price-slider"
        min={min}
        max={max}
        step="10"
        value={value}
        aria-label="מחיר מקסימלי"
        dir="rtl"
        onChange={(e) => onChange(+e.target.value)}
        style={{
          display: "block",
          width: "100%",
          height: "14px",
          margin: "8px 0",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.18)",
          WebkitAppearance: "none",
          appearance: "none",
          backdropFilter: "blur(8px) saturate(1.3)",
          WebkitBackdropFilter: "blur(8px) saturate(1.3)",
          background: `linear-gradient(to left, ${COLORS.glass.chipActive} 0%, ${COLORS.glass.accent} ${pct}%, rgba(255,255,255,0.16) ${pct}%, rgba(255,255,255,0.16) 100%)`,
        }}
      />
    </div>
  );
}
