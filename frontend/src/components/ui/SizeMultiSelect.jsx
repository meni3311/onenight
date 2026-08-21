import { useEffect, useState } from "react";
import { OTHER_SIZE } from "../../lib/data.js";
import { normalizeSize } from "../../lib/normalize.js";
import { FONTS } from "../../constants/theme.js";
import { Chip } from "../filters/Chip.jsx";

export function SizeMultiSelect({
  options,
  value = [],
  onChange,
  variant = "form",
  placeholder = "מידה אחרת",
}) {
  const custom = value.filter((v) => !options.includes(v));
  const [draft, setDraft] = useState(custom[0] || "");
  const [otherOpen, setOtherOpen] = useState(custom.length > 0);
  const [focused, setFocused] = useState(false);

  const glass = variant === "glass";

  useEffect(() => {
    if (value.length === 0 && !focused) {
      setDraft("");
      setOtherOpen(false);
    }
  }, [value.length, focused]);

  const toggleStandard = (size) => {
    onChange(
      value.includes(size) ? value.filter((v) => v !== size) : [...value, size],
    );
  };

  const setCustom = (next) => {
    const cleaned = next.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const standard = value.filter((v) => options.includes(v));
    onChange(cleaned ? [...standard, cleaned] : standard);
  };

  const commitCustom = () => {
    const size = normalizeSize(draft);
    const standard = value.filter((v) => options.includes(v));
    setDraft(options.includes(size) ? "" : size);
    if (!size) return onChange(standard);
    onChange(standard.includes(size) ? standard : [...standard, size]);
  };

  const closeOther = () => {
    setOtherOpen(false);
    setDraft("");
    onChange(value.filter((v) => options.includes(v)));
  };

  const renderChip = (key, label, active, onClick, extra = {}) =>
    glass ? (
      <Chip key={key} active={active} onClick={onClick}>{label}</Chip>
    ) : (
      <button
        key={key}
        type="button"
        aria-pressed={active}
        className={"chip" + (active ? " on" : "")}
        onClick={onClick}
        {...extra}
      >
        {label}
      </button>
    );

  return (
    <div className="chips">
      {options.map((s) => renderChip(s, s, value.includes(s), () => toggleStandard(s)))}

      {renderChip(
        "__other__",
        OTHER_SIZE,
        otherOpen,
        () => (otherOpen ? closeOther() : setOtherOpen(true)),
        { "aria-expanded": otherOpen },
      )}

      {otherOpen && (
        <div className="mt-2 w-full">
          <input
            type="text"
            value={draft}
            placeholder={placeholder}
            aria-label="מידה שאינה ברשימה"
            onChange={(e) => { setDraft(e.target.value); setCustom(e.target.value); }}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); commitCustom(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom(); } }}
            style={
              glass
                ? {
                    fontFamily: FONTS.jost,
                    fontSize: "13px",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#F3E9E6",
                    borderRadius: "9999px",
                    padding: "8px 16px",
                    width: "100%",
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
