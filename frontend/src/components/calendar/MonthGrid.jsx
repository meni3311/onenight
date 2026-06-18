import { MONTHS, DOW } from "./calendarConstants.js";

/* A single month grid for the availability range picker. Past and booked
   days are disabled; the selected range is highlighted. */
export function MonthGrid({ year, month, booked, selStart, selEnd, onPick }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const keyFor = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="w-full">
      <p className="mb-3 text-center font-display text-lg text-ink">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = keyFor(d);
          const date = new Date(year, month, d);
          const isPast = date < today;
          const isBooked = booked.includes(k);
          const disabled = isPast || isBooked;
          const inRange = selStart && selEnd && k >= selStart && k <= selEnd;
          const isEdge = k === selStart || k === selEnd;

          let cls = "relative grid h-9 place-items-center rounded-full text-sm transition-colors duration-150 ";
          if (disabled) {
            cls += "cursor-not-allowed text-muted/50 line-through";
          } else if (isEdge) {
            cls += "cursor-pointer bg-brand font-semibold text-white";
          } else if (inRange) {
            cls += "cursor-pointer bg-brand-light text-brand";
          } else {
            cls += "cursor-pointer text-ink hover:bg-brand-light";
          }

          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onPick(k)}
              aria-label={disabled ? `${k} לא זמין` : k}
              className={cls}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
