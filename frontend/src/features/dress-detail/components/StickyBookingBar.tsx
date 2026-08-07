import styles from '../dress-detail.module.css';

interface StickyBookingBarProps {
  price: number;
  canBook: boolean;
  onBook: () => void;
}

export function StickyBookingBar({
  price,
  canBook,
  onBook,
}: StickyBookingBarProps): JSX.Element {
  return (
    <div className={styles.ctaBar}>
      <span className={styles.ctaPrice}>
        ₪{price} <span className={styles.ctaPriceUnit}>/ לערב</span>
      </span>
      <button
        type="button"
        className={`${styles.ctaBtn} ${canBook ? '' : styles.ctaBtnOff}`}
        disabled={!canBook}
        onClick={onBook}
      >
        {canBook ? 'להזמנה' : 'בחרי מידה ותאריך'}
      </button>
    </div>
  );
}
