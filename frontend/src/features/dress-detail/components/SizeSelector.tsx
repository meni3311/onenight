import { useMemo } from 'react';
import type { DressSize } from '../types/dress.types';
import { SIZE_ORDER } from '../constants';
import styles from '../dress-detail.module.css';

interface SizeSelectorProps {
  sizes: DressSize[];
  selectedSize: string | null;
  onSelect: (size: string) => void;
}

interface RenderableSize {
  size: string;
  available: boolean;
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps): JSX.Element {
  // Show the canonical order, plus any non-standard sizes the dress offers.
  const renderable = useMemo<RenderableSize[]>(() => {
    const byLabel = new Map(sizes.map((s) => [s.size, s.available]));
    const extras = sizes
      .map((s) => s.size)
      .filter((label) => !SIZE_ORDER.includes(label));
    const ordered = [...SIZE_ORDER, ...extras];
    return ordered.map((label) => ({
      size: label,
      available: byLabel.get(label) ?? false,
    }));
  }, [sizes]);

  return (
    <section className={styles.section}>
      <p className={styles.label}>בחרי מידה</p>
      <div className={styles.sizes}>
        {renderable.map(({ size, available }) => {
          const selected = selectedSize === size;
          const className = [
            styles.size,
            selected ? styles.sizeOn : '',
            available ? '' : styles.sizeOff,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={size}
              type="button"
              className={className}
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onSelect(size)}
            >
              {size}
            </button>
          );
        })}
      </div>
    </section>
  );
}
