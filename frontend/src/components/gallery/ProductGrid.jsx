import { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard.jsx";

/* Soft, subtle fade-up reveal: small movement, short opacity, once only. */
const cardReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

/* Cards enter in pairs, 0.15s between each pair. */
const PAIR_STAGGER = 0.15;

/* Responsive product grid (4 / 3 / 2 columns) with a staggered reveal,
   plus an empty state that can prompt the user to publish. */
export function ProductGrid({ dresses, favIds, onFav, onOpen, emptyAction }) {
  /* favIds stays an array in the props API (callers are unchanged), but the
     per-card lookup was `favIds.includes(...)` inside the map — O(n²) across
     the grid. Must be declared before the early return below, or the hook
     order would change between the empty and non-empty renders. */
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  if (!dresses.length) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-line py-16 text-center">
        <p className="font-display text-2xl text-ink">לא נמצאו שמלות תואמות</p>
        <p className="max-w-xs text-sm text-muted">נסי להרחיב את הסינון, או פרסמי שמלה משלך כדי להתחיל.</p>
        {emptyAction && (
          <button
            type="button"
            onClick={emptyAction}
            className="mt-1 rounded-sm bg-brand px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-brand-dark"
          >
            פרסמי את שמלתך הראשונה
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
      {dresses.map((d, i) => (
        <motion.div
          key={d.id}
          /* min-w-0: a grid item's default min-width is `auto` (its
             content's min-content size), not 0. On a 2-up mobile row that
             lets one card's content — the size/city line is the usual
             culprit — force its column wider than a fixed 1fr share,
             shrinking the sibling column to compensate and leaving the two
             cards visibly unequal widths. min-w-0 removes that content-based
             floor so both columns hold their equal 1fr share regardless of
             what's inside. */
          className="min-w-0"
          initial={cardReveal.initial}
          whileInView={cardReveal.whileInView}
          viewport={cardReveal.viewport}
          transition={{ duration: 0.4, ease: "easeOut", delay: Math.floor(i / 2) * PAIR_STAGGER }}
        >
          {/* The grid is at most 4 columns (xl), so the first four cards are
              the only ones that can be above the fold on any breakpoint.
              One of them is the LCP element on the homepage — they load
              eagerly, everything below stays lazy. */}
          <ProductCard
            d={d}
            fav={favSet.has(d.id)}
            onFav={onFav}
            onOpen={onOpen}
            priority={i < 4}
          />
        </motion.div>
      ))}
    </div>
  );
}
