import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Img } from "../ui/Img.jsx";
import { COLORS, FONTS } from "../../constants/theme.js";

const ONE_LINE = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const HEART_PATH =
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

const BURST_COUNT = 5;

function makeBurstParticles() {
  return Array.from({ length: BURST_COUNT }, () => ({
    x: (Math.random() - 0.5) * 34,
    rotate: (Math.random() - 0.5) * 50,
    delay: Math.random() * 0.15,
  }));
}

function ProductCardBase({ d, fav, onFav, onOpen, priority = false }) {
  const prevFavRef = useRef(fav);
  const [burstId, setBurstId] = useState(0);
  useEffect(() => {
    if (fav && !prevFavRef.current) setBurstId((id) => id + 1);
    prevFavRef.current = fav;
  }, [fav]);
  const burstParticles = useMemo(() => (burstId ? makeBurstParticles() : []), [burstId]);

  return (
    <article onClick={() => onOpen(d)} className="group cursor-pointer rounded-none" style={{ background: "rgba(110,44,44,0.08)", borderRadius: 0 }}>
      {}
      <div className="relative aspect-[3/4] overflow-hidden rounded-none bg-neutral-100" style={{ borderRadius: 0 }}>
        <Img
          src={d.images[0]}
          color={d.colorHex}
          label={d.title}
          priority={priority}
          width={300}
          height={400}
          className="h-full w-full rounded-none object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
          style={{ borderRadius: 0 }}
        />

        {}
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
            stroke={fav ? COLORS.brand : COLORS.bordeaux}
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            className="transition-all duration-200"
          >
            <path d={HEART_PATH} />
          </svg>
        </button>

        {}
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

        {}
        {d.status === "pending" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur-sm">
            ממתינה לאישור
          </span>
        )}
      </div>

      {}
      <div className="px-1 pt-2 pb-2 text-start">
        {}
        <p style={{
          fontFamily: FONTS.jost,
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#999",
          ...ONE_LINE,
        }}>
          {}
          מידות {(d.sizes || []).join(" · ") || "—"}{d.city ? ` · ${d.city}` : ""}
        </p>

        {}
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
