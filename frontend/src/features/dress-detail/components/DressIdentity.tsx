import type { DressSourceValue } from '../types/dress.types';
import { SOURCE_LABELS } from '../constants';
import styles from '../dress-detail.module.css';

export type AvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable';

interface DressIdentityProps {
  name: string;
  source: DressSourceValue;
  price: number;
  availability: AvailabilityStatus;
}

const AVAILABILITY_TEXT: Record<AvailabilityStatus, string> = {
  idle: 'בחרי מידה ותאריכים כדי לבדוק זמינות',
  checking: 'בודקים זמינות…',
  available: 'פנויה לתאריכים שבחרת',
  unavailable: 'לא פנויה',
};

const AVAILABILITY_CLASS: Record<AvailabilityStatus, string> = {
  idle: styles.availNeutral,
  checking: styles.availNeutral,
  available: styles.availYes,
  unavailable: styles.availNo,
};

export function DressIdentity({
  name,
  source,
  price,
  availability,
}: DressIdentityProps): JSX.Element {
  return (
    <section className={styles.section}>
      <h1 className={styles.name}>{name}</h1>
      <p className={styles.seller}>{SOURCE_LABELS[source]}</p>
      <p className={styles.price}>
        ₪{price} <span className={styles.priceUnit}>/ לערב</span>
      </p>
      <div className={`${styles.avail} ${AVAILABILITY_CLASS[availability]}`}>
        <span className={styles.availDot} />
        {AVAILABILITY_TEXT[availability]}
      </div>
    </section>
  );
}
