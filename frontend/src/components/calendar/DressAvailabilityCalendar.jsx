import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { MONTHS, DOW } from "./calendarConstants.js";

const keyToDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateToKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Per-dress availability calendar, built on react-day-picker (mode
   "multiple") instead of the old hand-rolled grid — gets working
   touch/keyboard interaction and a responsive layout for free instead of
   us maintaining it by hand.

   `booked` is the same string[] of "YYYY-MM-DD" keys the rest of the app
   already uses for a dress's unavailable days (see AccountPage's
   toggleDate / the mock API's PATCH /api/dresses/:id/booked) — absence of
   a day from this list means available, per the original spec. This
   component only translates between that key format and the Date objects
   react-day-picker wants; it doesn't change what's stored or how.

   Theme is fully overridden in styles.css (search ".onenight-cal") to
   match the site's cream/bordeaux/rose/Assistant/sharp-corner system
   instead of the library's default blue theme. */
export function DressAvailabilityCalendar({ booked = [], onToggle }) {
  const selected = booked.map(keyToDate);

  /* react-day-picker's mode="multiple" onSelect hands back the *new* full
     selected array; we diff it against `booked` to find the single day
     that flipped and forward just that key to the existing toggle API
     (which only ever flips one day per call) — no change to that contract. */
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
