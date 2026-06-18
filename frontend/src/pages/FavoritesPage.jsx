import { ProductGrid } from "../components/gallery/ProductGrid.jsx";

/* The user's saved dresses, or an empty state prompting them to browse. */
export default function FavoritesPage({ dresses, favIds, onFav, onOpen, go }) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-28 pt-12 lg:px-10">
      <h2 className="mb-8 font-display text-4xl text-ink">המועדפים שלי</h2>
      {dresses.length ? (
        <ProductGrid dresses={dresses} favIds={favIds} onFav={onFav} onOpen={onOpen} />
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-line py-16 text-center">
          <p className="font-display text-2xl text-ink">עדיין לא שמרת שמלות</p>
          <p className="max-w-xs text-sm text-muted">
            לחצי על הלב בשמלות שאהבת והן יופיעו כאן.
          </p>
          <button
            type="button"
            onClick={() => go("home")}
            className="mt-1 rounded-sm bg-brand px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-brand-dark"
          >
            גלי שמלות
          </button>
        </div>
      )}
    </div>
  );
}
