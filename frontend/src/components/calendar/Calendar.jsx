import { useState } from "react";
import { MONTHS, DOW } from "./calendarConstants.js";

/* Single-month calendar used in the account area to mark a dress as
   booked/unavailable. Read-only unless `editable`. */
export function Calendar({ booked = [], editable = false, onToggle }) {
  const [m, setM] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), mo: d.getMonth() };
  });
  const first = new Date(m.y, m.mo, 1).getDay();
  const days = new Date(m.y, m.mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const key = (d) =>
    `${m.y}-${String(m.mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (n) =>
    setM((p) => {
      let mo = p.mo + n, y = p.y;
      if (mo < 0) { mo = 11; y--; }
      if (mo > 11) { mo = 0; y++; }
      return { y, mo };
    });

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="חודש קודם" className="grid h-7 w-7 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">›</button>
        <span className="font-display text-base text-ink">{MONTHS[m.mo]} {m.y}</span>
        <button type="button" onClick={() => shift(1)} aria-label="חודש הבא" className="grid h-7 w-7 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">‹</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = key(d);
          const isBooked = booked.includes(k);
          let cls = "grid h-8 place-items-center rounded-full text-sm transition-colors ";
          if (isBooked) cls += "bg-brand text-white ";
          else cls += "text-ink ";
          if (editable) cls += "cursor-pointer hover:bg-brand-light ";
          return (
            <button
              type="button"
              key={i}
              onClick={editable ? () => onToggle(k) : undefined}
              disabled={!editable}
              aria-pressed={isBooked}
              className={cls}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-line bg-white" /> פנוי</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand" /> תפוס</span>
        {editable && <span className="text-brand">לחצי לסימון</span>}
      </div>
    </div>
  );
}
