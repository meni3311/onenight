import { useQuery } from '@tanstack/react-query';
import { dressApi } from '../api/dress.api';
import type { DressSummary } from '../types/dress.types';
import styles from '../dress-detail.module.css';

interface SimilarDressesProps {
  dressId: string;
  onOpenDress: (id: string) => void;
}

const FIVE_MINUTES = 1000 * 60 * 5;
const SKELETON_COUNT = 4;

export function SimilarDresses({
  dressId,
  onOpenDress,
}: SimilarDressesProps): JSX.Element | null {
  const { data, isLoading, isError } = useQuery<DressSummary[], Error>({
    queryKey: ['similar', dressId],
    queryFn: () => dressApi.getSimilarDresses(dressId),
    staleTime: FIVE_MINUTES,
    enabled: dressId.length > 0,
  });

  // A failed rail should not break the page; just hide it.
  if (isError) return null;

  if (isLoading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.h2}>אולי תאהבי גם</h2>
        <div className={styles.similar}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skelCard}`} />
          ))}
        </div>
      </section>
    );
  }

  const dresses = data ?? [];
  if (dresses.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.h2}>אולי תאהבי גם</h2>
        <p className={styles.empty}>לא נמצאו שמלות דומות כרגע.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>אולי תאהבי גם</h2>
      <div className={styles.similar}>
        {dresses.map((dress) => {
          const cover = dress.images[0];
          return (
            <button
              key={dress.id}
              type="button"
              className={styles.simCard}
              onClick={() => onOpenDress(dress.id)}
            >
              {cover ? (
                <img className={styles.simImg} src={cover.url} alt={dress.name} />
              ) : (
                <span className={`${styles.simImg} ${styles.skeleton}`} aria-hidden />
              )}
              <span className={styles.simName}>{dress.name}</span>
              <span className={styles.simPrice}>₪{dress.price}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
