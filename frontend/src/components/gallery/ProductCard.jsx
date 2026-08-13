import { memo } from "react";
import { Img } from "../ui/Img.jsx";
import { COLORS, FONTS } from "../../constants/theme.js";

/* Product card: 3:4 image, hover zoom, glassy favorite toggle and a
   pending-approval flag for account/admin views.

   Memoized because this is the highest-count component on screen — one per
   listing — and it previously re-rendered on every App state change,
   including each keystroke in the search filter. Its props are now stable:
   `onFav`/`onOpen` are useCallback'd in App.jsx and `fav` is a boolean. */
function ProductCardBase({ d, fav, onFav, onOpen, priority = false }) {
  return (
    <article onClick={() => onOpen(d)} className="group cursor-pointer rounded-none" style={{ background: "rgba(110,44,44,0.08)", borderRadius: 0 }}>
      {/* Image — dominant element, subtle hover zoom */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-none bg-neutral-100" style={{ borderRadius: 0 }}>
        <Img
          src={d.images[0]}
          color={d.colorHex}
          label={d.title}
          priority={priority}
          /* Intrinsic 3:4 so the browser reserves the right box before CSS
             arrives. The wrapper's aspect-[3/4] is a Tailwind class, and
             Tailwind is currently applied by a runtime CDN script — until it
             executes there is no reserved height, so these attributes are
             what actually prevents the grid shifting on first paint. */
          width={300}
          height={400}
          className="h-full w-full rounded-none object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
          style={{ borderRadius: 0 }}
        />

        {/* Favorite — flex-centered heart in a subtle, glassy circle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFav(d.id); }}
          aria-label={fav ? "הסרה ממועדפים" : "הוספה למועדפים"}
          aria-pressed={fav}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          className="absolute left-3 top-3 h-9 w-9 rounded-full bg-white/30 backdrop-blur-md transition-transform duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg
            width="17" height="17" viewBox="0 0 24 24"
            fill={fav ? COLORS.brand : "none"}
            stroke={fav ? COLORS.brand : "#1a1a1a"}
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            className="transition-all duration-200"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* status flag for account/admin views — kept subtle & glassy */}
        {d.status === "pending" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur-sm">
            ממתינה לאישור
          </span>
        )}
      </div>

      {/* Info — flat, editorial, RTL-aware alignment, generous padding */}
      <div className="px-1 pt-2 pb-2 text-start">
        {/* Size — uppercase tracking, muted gray */}
        <p style={{
          fontFamily: FONTS.jost,
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#999",
        }}>
          מידה {d.size}{d.city ? ` · ${d.city}` : ""}
        </p>

        {/* Price — letter-spaced, with a lighter per-rental label */}
        <p style={{ marginTop: "6px" }}>
          <span style={{
            fontFamily: FONTS.jost,
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.04em",
            color: COLORS.bordeaux,
          }}>
            ₪{d.price}
          </span>
          <span style={{
            fontFamily: FONTS.jost,
            fontWeight: 300,
            fontSize: "12px",
            letterSpacing: "0.03em",
            color: COLORS.bordeaux,
            marginInlineStart: "6px",
          }}>
            / לערב
          </span>
        </p>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
