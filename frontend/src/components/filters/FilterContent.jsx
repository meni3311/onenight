import { hexToRgba } from "../../lib/color.js";
import { FONTS } from "../../constants/theme.js";
import { CATEGORIES } from "../../lib/data.js";
import { Icon } from "../ui/Icon.jsx";
import { FilterSection } from "./FilterSection.jsx";
import { Chip } from "./Chip.jsx";
import { PriceRange } from "./PriceRange.jsx";
import { SizeMultiSelect } from "../ui/SizeMultiSelect.jsx";
import {
  COLOR_SWATCHES,
  LETTER_SIZES,
  SOURCE_OPTIONS,
  PRICE,
  DRESS_LENGTH_OPTIONS,
  SLEEVE_LENGTH_OPTIONS,
} from "./filterConstants.js";

export function FilterContent({ f, setF }) {
  const toggleArr = (key, val) =>
    setF((p) => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter((x) => x !== val) : [...p[key], val],
    }));

  return (
    <div className="flex flex-col">
      {}
      <FilterSection title="גודל" icon={<Icon.ruler width="15" height="15" />}>
        <SizeMultiSelect
          options={LETTER_SIZES}
          value={f.sizes}
          onChange={(sizes) => setF((p) => ({ ...p, sizes }))}
          variant="glass"
          placeholder="מידה אחרת — לדוגמה 40"
        />
        <p className="mt-3" style={{ fontFamily: FONTS.jost, fontSize: "11px", color: "rgba(243,233,230,0.45)" }}>
          לחצי על מידה לפרטים
        </p>
      </FilterSection>

      {}
      <FilterSection title="קטגוריה" icon={<Icon.sparkle width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              active={f.categories.includes(c.value)}
              onClick={() => toggleArr("categories", c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </FilterSection>

      {}
      <FilterSection title="מחיר" icon={<Icon.tag width="15" height="15" />}>
        <PriceRange
          min={PRICE.min}
          max={PRICE.max}
          value={f.maxPrice}
          onChange={(v) => setF((p) => ({ ...p, maxPrice: v }))}
        />
      </FilterSection>

      {}
      <FilterSection title="צבע" icon={<Icon.palette width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((c) => {
            const active = f.colors.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleArr("colors", c.name)}
                style={{
                  fontFamily: FONTS.jost,
                  fontSize: "12.5px",
                  background: hexToRgba(c.hex, active ? 0.55 : 0.26),
                  backdropFilter: "blur(8px) saturate(1.3)",
                  WebkitBackdropFilter: "blur(8px) saturate(1.3)",
                  border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.22)",
                  boxShadow: active
                    ? `0 4px 14px ${hexToRgba(c.hex, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.25)`
                    : "inset 0 1px 0 rgba(255,255,255,0.12)",
                  color: "#F7ECE9",
                }}
                className="flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-all duration-200 ease-lux hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0]"
              >
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: c.hex,
                    border: "1px solid rgba(255,255,255,0.45)",
                    flex: "0 0 auto",
                  }}
                />
                {c.name}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {}
      <FilterSection title="מקור" icon={<Icon.store width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map(([v, l]) => (
            <Chip key={v} active={f.source === v} onClick={() => setF((p) => ({ ...p, source: v }))}>
              {l}
            </Chip>
          ))}
        </div>
      </FilterSection>

      {}
      <FilterSection title="אורך שמלה" icon={<Icon.ruler width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {DRESS_LENGTH_OPTIONS.map((l) => (
            <Chip key={l} active={f.dressLengths.includes(l)} onClick={() => toggleArr("dressLengths", l)}>
              {l}
            </Chip>
          ))}
        </div>
      </FilterSection>

      {}
      <FilterSection title="אורך שרוול" icon={<Icon.sparkle width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {SLEEVE_LENGTH_OPTIONS.map((l) => (
            <Chip key={l} active={f.sleeveLengths.includes(l)} onClick={() => toggleArr("sleeveLengths", l)}>
              {l}
            </Chip>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
