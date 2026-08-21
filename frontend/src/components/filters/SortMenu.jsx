import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { COLORS } from "../../constants/theme.js";

export const SORT_OPTIONS = [
  ["price_asc", "מחיר: מהנמוך לגבוה"],
  ["price_desc", "מחיר: מהגבוה לנמוך"],
  ["newest", "החדשות ביותר"],
  ["oldest", "הישנות ביותר"],
];

export function SortMenu({ sort, setSort }) {
  const [open, setOpen] = useState(false);
  const active = SORT_OPTIONS.find(([key]) => key === sort);

  const pick = (key) => {
    setSort(sort === key ? null : key);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "rgba(74,38,35,0.6)",
          backdropFilter: "blur(16px) saturate(1.4)",
          WebkitBackdropFilter: "blur(16px) saturate(1.4)",
          border: "1px solid rgba(230,190,180,0.28)",
          boxShadow: "0 10px 30px rgba(35,15,14,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        className="flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
      >
        <Icon.sort width="18" height="18" />
        <span className="inline-flex items-baseline gap-1">
          מיון
          {active && (
            <span className="text-xs font-bold" style={{ color: COLORS.glass.accent }}>
              1
            </span>
          )}
        </span>
      </button>

      {open && (
        <>
          {}
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="מיון תוצאות"
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              minWidth: "220px",
              background: "linear-gradient(160deg, rgba(86,42,39,0.94), rgba(58,28,26,0.96))",
              backdropFilter: "blur(28px) saturate(1.3)",
              WebkitBackdropFilter: "blur(28px) saturate(1.3)",
              border: "1px solid rgba(230,190,180,0.22)",
              boxShadow: "0 20px 50px rgba(35,15,14,0.5)",
              borderRadius: "16px",
              overflow: "hidden",
              zIndex: 60,
            }}
          >
            {SORT_OPTIONS.map(([key, label], i) => {
              const isActive = sort === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => pick(key)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    fontFamily: "'Assistant',sans-serif",
                    fontSize: "13px",
                    color: isActive ? COLORS.glass.accent : COLORS.glass.text,
                    fontWeight: isActive ? 700 : 400,
                    background: "transparent",
                    border: "none",
                    borderBottom: i < SORT_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                    cursor: "pointer",
                    textAlign: "start",
                  }}
                >
                  {label}
                  {isActive && <Icon.chevron width="14" height="14" style={{ transform: "rotate(-90deg)" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
