import { useState } from 'react';
import type { DressDetail } from '../types/dress.types';
import { CONDITION_LABELS } from '../constants';
import styles from '../dress-detail.module.css';

interface DressAccordionProps {
  dress: DressDetail;
}

interface AccordionRowProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionRow({
  title,
  open,
  onToggle,
  children,
}: AccordionRowProps): JSX.Element {
  return (
    <div className={styles.accRow}>
      <button
        type="button"
        className={styles.accHead}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <svg
          className={`${styles.accChevron} ${open ? styles.accChevronOpen : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`${styles.accBody} ${open ? styles.accBodyOpen : ''}`}>
        <div className={styles.accInner}>{children}</div>
      </div>
    </div>
  );
}

const DETAILS_INDEX = 0;

export function DressAccordion({ dress }: DressAccordionProps): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number>(DETAILS_INDEX);
  const toggle = (i: number): void => setOpenIndex((cur) => (cur === i ? -1 : i));

  return (
    <section className={styles.section}>
      <AccordionRow title="פרטי השמלה" open={openIndex === 0} onToggle={() => toggle(0)}>
        {dress.description && <p>{dress.description}</p>}
        <p>בד: {dress.fabric ?? '—'}</p>
        <p>צבע: {dress.color ?? '—'}</p>
        <p>מעצב: {dress.designer ?? '—'}</p>
        <p>מצב: {CONDITION_LABELS[dress.condition]}</p>
      </AccordionRow>

      <AccordionRow title="מדיניות השכרה" open={openIndex === 1} onToggle={() => toggle(1)}>
        <p>איסוף השמלה מתואם ישירות מול בעלת השמלה לאחר אישור ההזמנה. ההחזרה עד השעה 20:00 ביום שלאחר תום תקופת ההשכרה.</p>
      </AccordionRow>

      <AccordionRow title="מדיניות ביטול" open={openIndex === 2} onToggle={() => toggle(2)}>
        <p>מול המשכירה.</p>
      </AccordionRow>

      <AccordionRow title="שאלות ותשובות" open={openIndex === 3} onToggle={() => toggle(3)}>
        <p>אפשר למדוד לפני? כן, ניתן לתאם מדידה מול בעלת השמלה.</p>
        <p>מי אחראית על הניקוי? השמלה נמסרת נקייה ומוחזרת לאחר נקיה למראה. כתמים חריגים יחוייבו בניקוי יבש.</p>
        <p>יש פיקדון? ייתכן פיקדון קטן שנקבע מול בעלת השמלה ומוחזר בעת ההחזרה.</p>
      </AccordionRow>
    </section>
  );
}
