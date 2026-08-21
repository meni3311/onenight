import { memo } from "react";
import { Img } from "../ui/Img.jsx";
import { COLORS, FONTS } from "../../constants/theme.js";
import { CATEGORY_LABELS } from "../../lib/data.js";

/* How many tags a card shows before it stops. The card is a thumbnail with a
   few lines of text under it; a listing with fifteen tags would push the grid
   rows out of alignment with one another. The full set is on the detail page,
   which has the room. */
const CARD_HASHTAGS = 3;

/* The info block under the photo is pinned to this height so every card in
   the grid is the same height, whether or not it has hashtags.

   The photo itself is already a fixed aspect-[3/4] box, so it was never the
   variable part — the text under it was. Two rows there could change height:
   the size/city line (wraps on a narrow 2-column phone layout) and the
   hashtag row (absent entirely on a listing with no tags). Both are clamped
   to a single line below, which makes this height reachable rather than
   aspirational: min-height + non-wrapping content means the block can't
   overflow it and can't come up short either.

   Budget: 8 (pt-2) + 14 (size) + 6 + 19 (price) + 7 + 19 (tags) + 8 (pb-2). */
const CARD_INFO_MIN_HEIGHT = 84;

/* One-line clamp for the two rows that would otherwise vary — see above. */
const ONE_LINE = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* Product card: 3:4 image, hover zoom, glassy favorite toggle and a
   pending-approval flag for account/admin views.

   Memoized because this is the highest-count component on screen — one per
   listing — and without it every App state change re-renders all of them,
   including on each keystroke in the search filter. Its props are stable:
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
          /* Intrinsic 3:4 so the browser reserves the right box before the
             stylesheet applies, rather than reflowing the grid once the
             wrapper's aspect-[3/4] kicks in. */
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

        {/* Category badge. Square corners and a solid bordeaux fill, matching
            the card's own borderRadius: 0 and the brand palette — deliberately
            NOT the glassy rounded treatment of the favourite button and the
            pending flag, which are transient UI states rather than a property
            of the dress.

            Positioned bottom-LEFT, inside the image box, and with physical
            `left`/`bottom` rather than inset-inline properties. Two reasons:

            1. It sits over the photo, so it costs the card no height at all —
               a card with a badge is exactly as tall as one without, which is
               what keeps the grid rows aligned (see CARD_INFO_MIN_HEIGHT).
            2. `insetInlineEnd` resolves to the *left* edge under the app's
               RTL direction, which is where the favourite button already
               lives — the two were stacking in the same corner. Physical
               values here can't drift with direction. */}
        {CATEGORY_LABELS[d.category] && (
          <span
            style={{
              position: "absolute",
              left: "12px",
              bottom: "12px",
              borderRadius: 0,
              background: COLORS.bordeaux,
              color: COLORS.cream,
              fontFamily: FONTS.jost,
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              padding: "4px 9px",
            }}
          >
            {CATEGORY_LABELS[d.category]}
          </span>
        )}

        {/* status flag for account/admin views — kept subtle & glassy */}
        {d.status === "pending" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur-sm">
            ממתינה לאישור
          </span>
        )}
      </div>

      {/* Info — flat, editorial, RTL-aware alignment, generous padding.
          Fixed minimum height so every card in the grid ends at the same
          baseline; see CARD_INFO_MIN_HEIGHT. */}
      <div className="px-1 pt-2 pb-2 text-start" style={{ minHeight: `${CARD_INFO_MIN_HEIGHT}px` }}>
        {/* Size — uppercase tracking, muted gray */}
        <p style={{
          fontFamily: FONTS.jost,
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#999",
          ...ONE_LINE,
        }}>
          {/* `sizes` is an array now — every size this dress fits, not one.
              Guarded because ProductPage hands the card shape around and a
              stale object could still be a pre-migration one. */}
          מידות {(d.sizes || []).join(" · ") || "—"}{d.city ? ` · ${d.city}` : ""}
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

        {/* Hashtag chips. Square, hairline-bordered and muted — they sit under
            the price and must not compete with it.

            `flexWrap: nowrap` + overflow hidden: wrapping would let three
            long tags take a second line on one card and one on the next,
            which is what pushes grid rows out of alignment. Anything past the
            edge is cut — the full set is on the detail page. */}
        {d.hashtags?.length > 0 && (
          <div style={{ marginTop: "7px", display: "flex", flexWrap: "nowrap", gap: "4px", overflow: "hidden" }}>
            {d.hashtags.slice(0, CARD_HASHTAGS).map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: FONTS.jost,
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                  color: COLORS.eyebrow,
                  border: `1px solid ${COLORS.brandLight}`,
                  borderRadius: 0,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
