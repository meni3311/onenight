import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Img } from "../ui/Img.jsx";
import { COLORS, FONTS } from "../../constants/theme.js";

/* Primary hashtag shown next to the price (see the price row below) rather
   than as its own line — a listing's other tags are on the detail page,
   which has the room. Only `d.hashtags[0]` is shown: the price row has
   space for one short badge, not a row of them, and a single tag is enough
   to signal what the others cover. */

/* One-line clamp for the size/city row, which can otherwise wrap on a narrow
   2-column phone layout and grow that card taller than its neighbor. The
   price row is always one line too (see below for how the tag shares it
   without growing it), so this is the only row left that needs clamping —
   nothing in the info block varies with the listing anymore, which is what
   keeps every card the same height with or without a tag. */
const ONE_LINE = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* Same outline as the favorite button's own heart, reused for the burst
   particles so they read as "more of the same icon", not a different mark. */
const HEART_PATH =
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

/* How many hearts float up per like. */
const BURST_COUNT = 5;

/* Fresh random spread/rotation/stagger per burst — called once per like, not
   per render (see the useMemo below), so replaying the animation on a second
   like doesn't reuse the first burst's exact path. */
function makeBurstParticles() {
  return Array.from({ length: BURST_COUNT }, () => ({
    x: (Math.random() - 0.5) * 34, // horizontal drift, roughly ±17px
    rotate: (Math.random() - 0.5) * 50,
    delay: Math.random() * 0.15,
  }));
}

/* Product card: 3:4 image, hover zoom, glassy favorite toggle and a
   pending-approval flag for account/admin views.

   Memoized because this is the highest-count component on screen — one per
   listing — and without it every App state change re-renders all of them,
   including on each keystroke in the search filter. Its props are stable:
   `onFav`/`onOpen` are useCallback'd in App.jsx and `fav` is a boolean. */
function ProductCardBase({ d, fav, onFav, onOpen, priority = false }) {
  /* `fav` is owned by App.jsx, not this component — clicking the button
     doesn't flip it locally, it calls `onFav` and waits for the new prop to
     come back down. So the burst can't fire from the click handler itself;
     it has to watch for the prop's false→true edge here. `prevFavRef` is
     what makes it an edge (a single like) rather than a level (bursting on
     every render while `fav` happens to be true) — and it's specifically
     false→true, not "any change", so unliking stays silent. */
  const prevFavRef = useRef(fav);
  const [burstId, setBurstId] = useState(0);
  useEffect(() => {
    if (fav && !prevFavRef.current) setBurstId((id) => id + 1);
    prevFavRef.current = fav;
  }, [fav]);
  /* Recomputed only when a new burst actually starts, not on every render —
     see makeBurstParticles' own comment for why it's random at all. */
  const burstParticles = useMemo(() => (burstId ? makeBurstParticles() : []), [burstId]);

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
            /* Bordeaux outline even when not favorited — was a near-black
               #1a1a1a, which read as a plain UI-chrome icon rather than a
               brand-colored one. */
            stroke={fav ? COLORS.brand : COLORS.bordeaux}
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            className="transition-all duration-200"
          >
            <path d={HEART_PATH} />
          </svg>
        </button>

        {/* Heart burst — a few small bordeaux hearts float up from the
            favorite button and fade out. `key={burstId}` remounts the whole
            group on every like so the animation replays from its `initial`
            state even if the previous burst's elements are still fading;
            `pointer-events-none` keeps it from ever intercepting a click. */}
        {burstId > 0 && (
          <div key={burstId} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-9 w-9">
            {burstParticles.map((p, i) => (
              <motion.svg
                key={i}
                width="11" height="11" viewBox="0 0 24 24"
                fill={COLORS.bordeaux}
                style={{ position: "absolute", left: "50%", top: "50%" }}
                initial={{ opacity: 1, x: "-50%", y: "-50%", scale: 0.5, rotate: p.rotate }}
                animate={{ opacity: 0, x: `calc(-50% + ${p.x}px)`, y: "-46px", scale: 1 }}
                transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
              >
                <path d={HEART_PATH} />
              </motion.svg>
            ))}
          </div>
        )}

        {/* status flag for account/admin views — kept subtle & glassy */}
        {d.status === "pending" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur-sm">
            ממתינה לאישור
          </span>
        )}
      </div>

      {/* Info — flat, editorial, RTL-aware alignment, generous padding.
          Every row here is fixed content: one-line size/city (ONE_LINE
          clamp), and a price row with a fixed `height` that the tag shares
          rather than growing — see that row below. Nothing left in this
          block can change height between a listing with a tag and one
          without, so no minHeight is needed to force cards level. */}
      <div className="px-1 pt-2 pb-2 text-start">
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

        {/* Price + tag share one row instead of the tag getting a row of its
            own — that's what keeps this block the same height whether or
            not the listing has a tag. `height` (not minHeight) on the row
            is deliberate: it caps how tall the row can be regardless of the
            badge's own padding, rather than letting a taller badge stretch
            it on cards that happen to have one.

            Row order follows the app's `dir="rtl"` context, not an explicit
            side: a flex row's first child sits at the *physical* right under
            RTL and the second at the *physical* left, so with price first
            and the tag second, the tag always lands on the left without
            needing an insetInlineEnd-style property, which would resolve to
            the wrong physical side under RTL. */}
        <div style={{ marginTop: "6px", height: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p>
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

          {d.hashtags?.[0] && (
            <span style={{
              fontFamily: FONTS.jost,
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: COLORS.cream,
              background: COLORS.bordeaux,
              borderRadius: 0,
              padding: "2px 6px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              #{d.hashtags[0]}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
