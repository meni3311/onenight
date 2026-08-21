import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { MONTHS, DOW } from "./calendarConstants.js";

const keyToDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateToKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DressAvailabilityCalendar({ booked = [], onToggle }) {
  const selected = booked.map(keyToDate);

  const handleSelect = (newDates) => {
    const newKeys = (newDates || []).map(dateToKey);
    const added = newKeys.find((k) => !booked.includes(k));
    const removed = booked.find((k) => !newKeys.includes(k));
    const changed = added ?? removed;
    if (changed) onToggle(changed);
  };

  return (
    <div className="onenight-cal">
      <DayPicker
        mode="multiple"
        dir="rtl"
        selected={selected}
        onSelect={handleSelect}
        showOutsideDays
        fixedWeeks
        formatters={{
          formatCaption: (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
          formatWeekdayName: (date) => DOW[date.getDay()],
        }}
      />
      <div className="onenight-cal-legend">
        <span className="onenight-cal-legend-item">
          <span className="onenight-cal-dot onenight-cal-dot--free" /> פנוי
        </span>
        <span className="onenight-cal-legend-item">
          <span className="onenight-cal-dot onenight-cal-dot--busy" /> תפוס
        </span>
        <span className="onenight-cal-hint">לחצי על תאריך לסימון</span>
      </div>
    </div>
  );
}
