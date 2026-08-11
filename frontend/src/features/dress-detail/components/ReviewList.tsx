import type { Review } from '../types/dress.types';
import { MAX_RATING } from '../constants';
import styles from '../dress-detail.module.css';

interface ReviewListProps {
  reviews: Review[];
}

function Stars({ rating }: { rating: number }): JSX.Element {
  const safe = Math.max(0, Math.min(MAX_RATING, rating));
  return (
    <span className={styles.stars} aria-label={`${safe} מתוך ${MAX_RATING}`}>
      {'★'.repeat(safe)}
      {'☆'.repeat(MAX_RATING - safe)}
    </span>
  );
}

export function ReviewList({ reviews }: ReviewListProps): JSX.Element {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <h2 className={styles.h2}>מה אמרו עליה</h2>
      {reviews.length === 0 ? (
        <p className={styles.empty}>עדיין אין ביקורות על השמלה הזו.</p>
      ) : (
        <div className={styles.reviews}>
          {reviews.map((review) => (
            <article key={review.id} className={styles.review}>
              <div className={styles.reviewTop}>
                <span className={styles.reviewName}>{review.reviewer}</span>
                <Stars rating={review.rating} />
              </div>
              <p className={styles.reviewText}>{review.text}</p>
              <span className={styles.reviewSize}>מידה {review.sizeWorn}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
