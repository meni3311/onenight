import { useMemo, useState } from 'react';
import type { DateRange, UnavailableDateRange } from '../types/dress.types';
import { HE_MONTHS, HE_WEEKDAYS } from '../constants';
import styles from '../dress-detail.module.css';

interface DatePickerProps {
  unavailableDates: UnavailableDateRange[];
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  isLoading?: boolean;
}

const keyOf = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parseKey = (k: string): Date => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Expand booked ranges into a set of individual day keys. */
function bookedKeySet(ranges: UnavailableDateRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) {
    const start = new Date(range.start);
    const end = new Date(range.end);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      set.add(keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    }
  }
  return set;
}

function summarise(value: DateRange): string {
  const start = parseKey(value.startDate);
  const end = parseKey(value.endDate);
  const nights =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const label =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ב${HE_MONTHS[start.getMonth()]}`
      : `${start.getDate()} ב${HE_MONTHS[start.getMonth()]} – ${end.getDate()} ב${HE_MONTHS[end.getMonth()]}`;
  return `${label} | ${nights} לילות`;
}

export function DatePicker({
  unavailableDates,
  value,
  onChange,
  isLoading = false,
}: DatePickerProps): JSX.Element {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [view, setView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });

  const booked = useMemo(
    () => bookedKeySet(unavailableDates),
    [unavailableDates],
  );

  const shift = (delta: number): void =>
    setView((p) => {
      let m = p.m + delta;
      let y = p.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return { y, m };
    });

  const pick = (key: string): void => {
    if (!value || (value.startDate && value.endDate)) {
      onChange({ startDate: key, endDate: '' });
      return;
    }
    if (key < value.startDate) {
      onChange({ startDate: key, endDate: '' });
      return;
    }
    onChange({ startDate: value.startDate, endDate: key });
  };

  const inRange = (key: string): boolean => {
    if (!value || !value.endDate) return false;
    return key >= value.startDate && key <= value.endDate;
  };

  if (isLoading) {
    return (
      <section className={styles.section}>
        <p className={styles.label}>בחרי תאריכי השכרה</p>
        <div className={`${styles.skeleton} ${styles.skelLine}`} />
        <div className={`${styles.skeleton} ${styles.skelLine}`} />
        <div className={`${styles.skeleton} ${styles.skelLine}`} />
      </section>
    );
  }

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <section className={styles.section}>
      <p className={styles.label}>בחרי תאריכי השכרה</p>
      <div className={styles.calendar}>
        <div className={styles.calHead}>
          <button type="button" className={styles.calNav} aria-label="חודש קודם" onClick={() => shift(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <span className={styles.calTitle}>{HE_MONTHS[view.m]} {view.y}</span>
          <button type="button" className={styles.calNav} aria-label="חודש הבא" onClick={() => shift(1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>
        <div className={styles.calGrid}>
          {HE_WEEKDAYS.map((d) => (
            <div key={d} className={styles.calDow}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`empty-${i}`} />;
            const key = keyOf(view.y, view.m, d);
            const date = new Date(view.y, view.m, d);
            const disabled = date < today || booked.has(key);
            const isEdge = key === value?.startDate || key === value?.endDate;
            const isMid = inRange(key) && !isEdge;
            const className = [
              styles.calDay,
              disabled ? styles.calDayOff : '',
              isEdge ? styles.calDayEdge : '',
              isMid ? styles.calDayMid : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={key}
                type="button"
                className={className}
                disabled={disabled}
                aria-label={disabled ? `${key} לא זמין` : key}
                onClick={() => pick(key)}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      {value?.startDate && value.endDate && (
        <p className={styles.rangeSummary}>{summarise(value)}</p>
      )}
    </section>
  );
}
