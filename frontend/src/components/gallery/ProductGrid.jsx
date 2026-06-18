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
          initial={cardReveal.initial}
          whileInView={cardReveal.whileInView}
          viewport={cardReveal.viewport}
          transition={{ duration: 0.4, ease: "easeOut", delay: Math.floor(i / 2) * PAIR_STAGGER }}
        >
          <ProductCard d={d} fav={favIds.includes(d.id)} onFav={onFav} onOpen={onOpen} />
        </motion.div>
      ))}
    </div>
  );
}
