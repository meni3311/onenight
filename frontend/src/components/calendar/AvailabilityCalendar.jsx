import { useState, useMemo } from "react";
import { MonthGrid } from "./MonthGrid.jsx";

/* Two-month availability range picker used in the detail modal.
   `value` is { start, end }; clicking builds a start→end range. */
export function AvailabilityCalendar({ booked = [], value, onChange }) {
  const [base, setBase] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), mo: d.getMonth() };
  });
  const next = useMemo(() => {
    let mo = base.mo + 1, y = base.y;
    if (mo > 11) { mo = 0; y++; }
    return { y, mo };
  }, [base]);

  const shift = (n) =>
    setBase((p) => {
      let mo = p.mo + n, y = p.y;
      if (mo < 0) { mo = 11; y--; }
      if (mo > 11) { mo = 0; y++; }
      return { y, mo };
    });

  const pick = (k) => {
    const { start, end } = value;
    if (!start || (start && end)) {
      onChange({ start: k, end: null });
    } else if (k < start) {
      onChange({ start: k, end: null });
    } else {
      onChange({ start, end: k });
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="חודש קודם" className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">
          ›
        </button>
        <button type="button" onClick={() => shift(1)} aria-label="חודש הבא" className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">
          ‹
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <MonthGrid year={base.y} month={base.mo} booked={booked} selStart={value.start} selEnd={value.end} onPick={pick} />
        <div className="hidden sm:block">
          <MonthGrid year={next.y} month={next.mo} booked={booked} selStart={value.start} selEnd={value.end} onPick={pick} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand" /> נבחר</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand-light" /> טווח</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-line bg-white" /> פנוי</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-line line-through" /> תפוס</span>
      </div>
    </div>
  );
}
