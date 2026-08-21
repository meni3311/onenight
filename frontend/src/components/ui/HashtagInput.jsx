import { useState } from "react";
import { normalizeHashtag, MAX_HASHTAGS } from "../../lib/normalize.js";
import { FONTS } from "../../constants/theme.js";

export function HashtagInput({ value = [], onChange, variant = "form" }) {
  const [draft, setDraft] = useState("");
  const glass = variant === "glass";
  const full = value.length >= MAX_HASHTAGS;

  const commit = (raw) => {
    const tag = normalizeHashtag(raw);
    setDraft("");
    if (!tag || full || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return;
    e.preventDefault();
    const tags = text.split(",").map(normalizeHashtag).filter(Boolean);
    const next = [...value];
    for (const tag of tags) {
      if (next.length >= MAX_HASHTAGS) break;
      if (!next.includes(tag)) next.push(tag);
    }
    setDraft("");
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="chips mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className={glass ? "" : "chip on"}
              style={
                glass
                  ? {
                      fontFamily: FONTS.jost,
                      fontSize: "12.5px",
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.22)",
                      color: "#F3E9E6",
                      borderRadius: "9999px",
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }
                  : { display: "inline-flex", alignItems: "center", gap: "6px" }
              }
            >
              #{tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`הסרת התגית ${tag}`}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: "14px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={draft}
        disabled={full}
        placeholder={full ? `הגעת ל-${MAX_HASHTAGS} תגיות` : "לדוגמה: ערב, קיץ, נצנצים"}
        aria-label="תגיות"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => commit(draft)}
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
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        מפרידים עם פסיק או Enter · עד {MAX_HASHTAGS} תגיות
      </p>
    </div>
  );
}
