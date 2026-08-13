import { useRef, useState } from 'react';
import type { DressImage } from '../types/dress.types';
import styles from '../dress-detail.module.css';

interface DressGalleryProps {
  images: DressImage[];
  dressName: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}

const SWIPE_THRESHOLD = 40;

export function DressGallery({
  images,
  dressName,
  isFavorite,
  onToggleFavorite,
  onBack,
}: DressGalleryProps): JSX.Element {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const goTo = (next: number): void => {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent): void => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      // RTL: swipe left → next, swipe right → previous.
      goTo(dx < 0 ? index + 1 : index - 1);
    }
    touchStartX.current = null;
  };

  const current = images[index];

  return (
    <section
      className={styles.gallery}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {current ? (
        <img className={styles.galleryImg} src={current.url} alt={dressName} />
      ) : (
        <div className={`${styles.galleryImg} ${styles.skeleton}`} aria-hidden />
      )}

      <button
        type="button"
        className={`${styles.glassBtn} ${styles.glassBack}`}
        aria-label="חזרה לגלריית השמלות"
        onClick={onBack}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <button
        type="button"
        className={`${styles.glassBtn} ${styles.glassFav}`}
        aria-label={isFavorite ? 'הסרה ממועדפים' : 'הוספה למועדפים'}
        aria-pressed={isFavorite}
        onClick={onToggleFavorite}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? '#E8457A' : 'none'} stroke={isFavorite ? '#E8457A' : '#fff'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {count > 1 && (
        <div className={styles.dots}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`תמונה ${i + 1}`}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
