import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { ALPHA, FONTS } from "../../constants/theme.js";

export function FilterSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: ALPHA.glassBorder }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <span style={{ color: "rgba(243,233,230,0.7)" }}>{icon}</span>
          <span
            style={{
              fontFamily: FONTS.jost,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "rgba(243,233,230,0.72)",
            }}
          >
            {title}
          </span>
        </span>
        <Icon.chevron
          width="16"
          height="16"
          style={{
            color: "rgba(243,233,230,0.7)",
            transition: "transform .25s ease",
            transform: open ? "rotate(0deg)" : "rotate(180deg)",
          }}
        />
      </button>
      <div className={open ? "pb-5" : "hidden"}>{children}</div>
    </div>
  );
}
