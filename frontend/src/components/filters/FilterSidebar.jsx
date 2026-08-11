import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { COLORS } from "../../constants/theme.js";
import { useInView } from "../../hooks/useInView.js";
import { FilterContent } from "./FilterContent.jsx";
import { ResetLink } from "./ResetLink.jsx";
import { SearchButton } from "./SearchButton.jsx";
import { activeFilterCount, EMPTY_FILTERS } from "./filterConstants.js";

/* Floating filter trigger + centered frosted-glass filter modal.
   The trigger only appears once the gallery (#browse) is in view.
   `children` (e.g. the sort button) render alongside the trigger in the
   same fixed/centered row, so any floating sibling controls fade in/out
   together with it and sit visually paired next to it. */
export function FilterSidebar({ f, setF, resultCount, children }) {
  const [open, setOpen] = useState(false);
  const [panelIn, setPanelIn] = useState(false);
  const showTrigger = useInView("browse", { rootMargin: "-20% 0px 0px 0px" });
  const count = activeFilterCount(f);
  const clearAll = () => setF({ ...EMPTY_FILTERS });

  const openModal = () => {
    setOpen(true);
    requestAnimationFrame(() => setPanelIn(true));
  };
  const closeModal = () => {
    setPanelIn(false);
    setTimeout(() => setOpen(false), 320);
  };

  return (
    <>
      {/* Floating trigger row — burgundy frosted glass, centered at the bottom */}
      <div
        style={{
          opacity: showTrigger ? 1 : 0,
          pointerEvents: showTrigger ? "auto" : "none",
        }}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 transition-opacity duration-300 ease-out"
      >
        <button
          type="button"
          onClick={openModal}
          style={{
            background: "rgba(74,38,35,0.6)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(230,190,180,0.28)",
            boxShadow: "0 10px 30px rgba(35,15,14,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
          className="flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
        >
          <Icon.slider width="18" height="18" />
          <span className="inline-flex items-baseline gap-1">
            סינון
            {count > 0 && (
              <span className="text-xs font-bold" style={{ color: COLORS.glass.accent }}>
                {count}
              </span>
            )}
          </span>
        </button>
        {children}
      </div>

      {/* Centered floating frosted-glass card */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* overlay — click to close */}
          <div
            onClick={closeModal}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(30,14,13,0.45)",
              opacity: panelIn ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
          {/* glass card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="סינון שמלות"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "440px",
              maxHeight: "86vh",
              background: "linear-gradient(160deg, rgba(86,42,39,0.62), rgba(58,28,26,0.66))",
              backdropFilter: "blur(28px) saturate(1.3)",
              WebkitBackdropFilter: "blur(28px) saturate(1.3)",
              border: "1px solid rgba(230,190,180,0.22)",
              boxShadow: "0 30px 70px rgba(35,15,14,0.55)",
              borderRadius: "24px",
              opacity: panelIn ? 1 : 0,
              transform: panelIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.97)",
              transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
            }}
            className="flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 pt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="flex items-baseline gap-3">
                <h2 style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontWeight: 600, fontSize: "20px", letterSpacing: "0.5px", color: "#F7ECE9" }}>
                  סינון
                </h2>
                <ResetLink onClick={clearAll} />
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="סגירה"
                style={{ background: "rgba(255,255,255,0.07)", color: "#F7ECE9" }}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.14)] focus:outline-none"
              >
                <Icon.close width="18" height="18" className="block" />
              </button>
            </div>

            {/* Scrollable filters */}
            <div
              className="glass-scroll flex-1 px-6 py-4"
              style={{ overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <FilterContent f={f} setF={setF} />
            </div>

            {/* Centered round search button */}
            <div className="px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              <SearchButton resultCount={resultCount} onClick={closeModal} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
