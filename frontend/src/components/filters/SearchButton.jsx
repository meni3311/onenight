import { Icon } from "../ui/Icon.jsx";
import { COLORS, FONTS } from "../../constants/theme.js";

/* Round burgundy-glass "search" button + live result count for the panel. */
export function SearchButton({ resultCount, onClick }) {
  return (
    <div className="flex flex-col items-center pt-1">
      <button
        type="button"
        onClick={onClick}
        aria-label="חיפוש"
        style={{
          width: "180px",
          height: "56px",
          background: "linear-gradient(145deg, rgba(139,58,58,0.95), rgba(110,44,44,0.95))",
          border: "1px solid rgba(230,185,176,0.45)",
          boxShadow: "0 12px 30px rgba(40,18,16,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: COLORS.glass.textSoft,
        }}
        className="group flex items-center justify-center gap-2 rounded-full transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-8px_rgba(139,58,58,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0] focus-visible:ring-offset-0"
      >
        <Icon.search width="20" height="20" />
        <span style={{ fontFamily: FONTS.jost, fontSize: "14px", letterSpacing: "1px" }}>
          חיפוש
        </span>
      </button>
      <span className="mt-3" style={{ fontFamily: FONTS.jost, fontSize: "12px", color: "rgba(243,233,230,0.6)" }}>
        <span key={resultCount} className="count-pulse">{resultCount}</span> שמלות
      </span>
    </div>
  );
}
