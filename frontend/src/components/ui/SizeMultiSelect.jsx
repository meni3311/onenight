import { useEffect, useState } from "react";
import { OTHER_SIZE } from "../../lib/data.js";
import { normalizeSize } from "../../lib/normalize.js";
import { FONTS } from "../../constants/theme.js";
import { Chip } from "../filters/Chip.jsx";

/* Multi-select size picker, shared by the publish form, the owner's edit form
   and the browse filter panel.

   `value` is the whole sizes array — standard and free-text alike, with no
   separate "other" field in the data. That is what lets the publish form and
   the filter serialize identically. The split back into chips and free text is
   derived on every render, never stored:

     standard = value ∩ options      (the lit chips)
     custom   = value \ options      (whatever is in the Other box)

   `options` differs by caller on purpose. The publish form passes the full
   SIZES list; the filter passes LETTER_SIZES, which omits numeric sizes by
   design. A numeric size is therefore custom in the filter and standard in the
   form, and the derivation above handles both without either caller knowing.

   Two visual variants, because this lands in two very different contexts: the
   light form card, which already has `.chip` styling in styles.css, and the
   dark frosted filter sidebar, which has the glass <Chip>. */
export function SizeMultiSelect({
  options,
  value = [],
  onChange,
  variant = "form",
  placeholder = "מידה אחרת",
}) {
  const custom = value.filter((v) => !options.includes(v));
  const [draft, setDraft] = useState(custom[0] || "");
  /* Open when the array already holds a non-standard size, so reopening an
     edit form or a saved filter shows the value instead of an empty control. */
  const [otherOpen, setOtherOpen] = useState(custom.length > 0);
  const [focused, setFocused] = useState(false);

  const glass = variant === "glass";

  /* Collapse and clear when the whole selection is emptied from outside — the
     filter panel's reset link, or a form reset after publishing. Guarded on
     focus so it can't yank the box out from under someone who is mid-edit and
     has momentarily cleared it; the tidy-up then happens on blur instead.

     Deliberately keyed on the array being empty rather than on the custom
     value, which would fire on every keystroke and truncate multi-word input
     ("38 ארוך" would collapse back to "38" the moment the space was typed). */
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

  /* Propagate a lightly cleaned draft on every keystroke so the browse filter
     reacts as you type, but hold the case-folding back for blur — rewriting
     "x" into "XL" mid-keystroke would fight the person typing. Commas are
     stripped here and not later because the filter serializes this facet as a
     comma-separated query param. */
  const setCustom = (next) => {
    const cleaned = next.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const standard = value.filter((v) => options.includes(v));
    onChange(cleaned ? [...standard, cleaned] : standard);
  };

  /* On blur (or Enter), run the real normalizer. If the text folds onto a
     standard size — "xl" → "XL" — it stops being custom and simply lights that
     chip: the derivation at the top of this component sees it in `options`, so
     the box empties itself and nothing is stored twice. */
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
