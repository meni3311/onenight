/* ============================================================
   onenight — luxury redesign · Tailwind component library (RTL)
   Deliverables: Nav · Hero · FilterSidebar · ProductCard ·
                 ProductGrid · DetailModal (+ Calendar)
   Styling: Tailwind (Play CDN config in index.html) + token CSS.
   ============================================================ */
import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { CONDITIONS, placeholder } from "./data.js";

/* Premium reveal: subtle fade-in + slide-up, smooth (non-bouncy) easing, once only */
const cardReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};
const cardEase = [0.16, 1, 0.3, 1];

/* ============================================================
   Shared helpers
   ============================================================ */

/* Curated color swatches (name → hex) for the filter + chips.
   `name` is the matchable value (matches d.color in data); order follows the
   filter spec: white, black, red, pink, navy, gold, nude/beige, green. */
export const COLOR_SWATCHES = [
  { name: "לבן", hex: "#FFFFFF" },
  { name: "שחור", hex: "#2A2A2A" },
  { name: "אדום", hex: "#B23A48" },
  { name: "ורוד", hex: "#E8457A" },
  { name: "תכלת", hex: "#26365E" },
  { name: "זהב", hex: "#C9A86A" },
  { name: "שמפניה", hex: "#E2D2B8" },
  { name: "ירוק", hex: "#3E5A48" },
  { name: "כסף", hex: "#C8C8CC" },
  { name: "סגול", hex: "#5E4B79" },
];

/* hex (#RGB or #RRGGBB) → rgba() string with the given alpha */
function hexToRgba(hex, a = 1) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* date key helper, matches the booked[] format "YYYY-MM-DD" */
const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/* Is the dress free this coming weekend (Fri+Sat in Israel)? */
export function freeThisWeekend(booked = []) {
  const now = new Date();
  const fri = new Date(now);
  fri.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7)); // next Friday
  const sat = new Date(fri);
  sat.setDate(fri.getDate() + 1);
  return !booked.includes(keyOf(fri)) && !booked.includes(keyOf(sat));
}

/* Image with graceful SVG fallback */
export function Img({ src, color, label, className = "", ...rest }) {
  const [err, setErr] = useState(false);
  return (
    <img
      {...rest}
      src={err ? placeholder(color || "#8B3A3A", label) : src}
      onError={() => setErr(true)}
      alt={label || ""}
      loading="lazy"
      className={className}
    />
  );
}

/* Heart / wishlist toggle */
export function Heart({ active, onClick, label, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label || (active ? "הסרה ממועדפים" : "הוספה למועדפים")}
      aria-pressed={active}
      className={
        "group/heart grid place-items-center rounded-full transition-all duration-200 ease-lux " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
        className
      }
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        className={
          "transition-all duration-200 ease-lux " +
          (active ? "animate-heart-pop" : "group-hover/heart:scale-110")
        }
        fill={active ? "#8B3A3A" : "rgba(255,255,255,0.25)"}
        stroke={active ? "#8B3A3A" : "#FFFFFF"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

/* Small inline icon set for metadata + nav */
const Icon = {
  pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ruler: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8h18v8H3z" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
    </svg>
  ),
  sparkle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 9 9M15 15l2.7 2.7M17.7 6.3 15 9M9 15l-2.7 2.7" />
    </svg>
  ),
  store: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 9h16l-1-5H5L4 9Z" /><path d="M5 9v10h14V9" /><path d="M9 19v-5h6v5" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  slider: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="#fff" /><circle cx="15" cy="12" r="2" fill="#fff" /><circle cx="8" cy="18" r="2" fill="#fff" />
    </svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  hash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </svg>
  ),
  tag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" /><circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  ),
  palette: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="13.5" cy="6.5" r="1.2" /><circle cx="17.5" cy="10.5" r="1.2" /><circle cx="8.5" cy="7.5" r="1.2" /><circle cx="6.5" cy="12.5" r="1.2" />
      <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-1.4-1-1.8-1-3a1.5 1.5 0 0 1 1.5-1.5H17a5 5 0 0 0 5-5c0-4.5-4.5-8-10-8Z" />
    </svg>
  ),
};

/* ============================================================
   1 · Logo
   ============================================================ */
export function Logo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="onenight — דף הבית"
      className="group flex flex-col items-start leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
    >
      <span className="font-display text-[26px] font-medium tracking-tight text-ink lowercase" dir="ltr">
        onenight
      </span>
      <span className="mt-0.5 font-body text-[11px] font-medium tracking-[0.22em] text-muted">
        השכרת שמלות ערב
      </span>
    </button>
  );
}

/* ============================================================
   2 · Navigation  (sticky · blur-on-scroll · RTL · mobile menu)
   ============================================================ */
export function SiteHeader({ route, go, user, favCount = 0, onLogin, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const items = [
    { key: "home", label: "בית" },
    { key: "publish", label: "פרסמי שמלה" },
    { key: "favorites", label: "מועדפים", badge: favCount },
  ];

  const NavLink = ({ item, big }) => (
    <button
      type="button"
      onClick={() => {
        go(item.key);
        setOpen(false);
      }}
      className={
        (big ? "text-2xl font-display " : "text-[11px] lg:text-[14px] font-body font-semibold tracking-[0.16em] lg:tracking-[0.2em] uppercase ") +
        "relative inline-flex items-center gap-1.5 pb-1 transition-colors duration-200 " +
        (route === item.key ? "text-ink" : "text-muted hover:text-ink")
      }
    >
      {item.label}
      {item.badge > 0 && (
        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white">
          {item.badge}
        </span>
      )}
      {route === item.key && (
        <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b transition-all duration-300 ease-lux"
        style={{
          background: scrolled ? "rgba(110,44,44,0.16)" : "rgba(110,44,44,0.08)",
          backdropFilter: "blur(14px) saturate(1.4)",
          WebkitBackdropFilter: "blur(14px) saturate(1.4)",
          borderBottom: scrolled
            ? "1px solid rgba(139,58,58,0.22)"
            : "1px solid rgba(139,58,58,0.12)",
        }}
      >
        <div className="mx-auto grid h-[72px] max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-6 px-6 lg:px-10">
          <Logo onClick={() => go("home")} />

          {/* desktop nav — centered (absolutely centered on wide screens so it stays
              dead-center regardless of the left-pinned account button) */}
          <nav className="hidden items-center justify-center gap-9 md:flex lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
            {items.map((it) => (
              <NavLink key={it.key} item={it} />
            ))}
          </nav>

          {/* end actions — pinned to the far-left edge of the navbar on wide screens */}
          <div className="flex items-center justify-end gap-1 lg:absolute lg:inset-y-0 lg:left-6 lg:z-10">
            {user ? (
              <div className="hidden items-center gap-4 md:flex">
                <button
                  type="button"
                  onClick={() => go("account")}
                  className={
                    "flex items-center gap-1.5 text-[11px] lg:text-[14px] font-semibold uppercase tracking-[0.16em] lg:tracking-[0.2em] transition-colors " +
                    (route === "account" ? "text-ink" : "text-muted hover:text-ink")
                  }
                >
                  <Icon.user width="16" height="16" className="block lg:h-[22px] lg:w-[22px]" />
                  האזור האישי
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[11px] lg:text-[14px] font-semibold uppercase tracking-[0.16em] lg:tracking-[0.2em] text-muted transition-colors hover:text-ink"
                >
                  יציאה
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                aria-label="כניסה לחשבון"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand md:flex lg:h-12 lg:w-12"
              >
                <Icon.user width="18" height="18" className="block lg:h-[26px] lg:w-[26px]" />
              </button>
            )}

            {/* mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="פתיחת תפריט"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-brand-light md:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="block">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile full-screen menu */}
      {open && (
        <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-canvas md:hidden">
          <div className="flex h-[72px] items-center justify-between px-6">
            <Logo onClick={() => { go("home"); setOpen(false); }} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירת תפריט"
              className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-brand-light"
            >
              <Icon.close width="22" height="22" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-start gap-7 px-8 pt-10">
            {items.map((it) => (
              <NavLink key={it.key} item={it} big />
            ))}
            <div className="my-2 h-px w-12 bg-brand" />
            {user ? (
              <>
                <button type="button" onClick={() => { go("account"); setOpen(false); }} className="font-display text-2xl text-muted hover:text-ink">
                  האזור האישי
                </button>
                <button type="button" onClick={() => { onLogout(); setOpen(false); }} className="font-display text-2xl text-muted hover:text-ink">
                  יציאה
                </button>
              </>
            ) : (
              <button type="button" onClick={() => { onLogin(); setOpen(false); }} className="font-display text-2xl text-muted hover:text-ink">
                כניסה לחשבון
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

/* ============================================================
   3 · Homepage Hero  (full-bleed · serif display · scroll cue)
   ============================================================ */
export function Hero({ onPublish, onBrowse }) {
  return (
    <>
      {/* Mobile hero — full-width dress image with elegant left-aligned overlay */}
      <section className="relative w-full overflow-hidden md:hidden">
        <img src="/dress.png" alt="" className="block w-full" />
        {/* legibility wash on the left where the text & buttons sit */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        <div
          dir="ltr"
          className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center gap-6 px-6"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}
        >
          {/* English heading — left aligned */}
          <h1 className="text-left font-display text-[2.4rem] font-light italic leading-[1.05] text-white">
            Don’t buy it.<br />Rent it.
          </h1>

          {/* Glassmorphism CTAs — directly below the heading, left anchored */}
          <div className="flex flex-col items-start gap-3">
            <button
              type="button"
              onClick={onBrowse}
              style={{
                background: "rgba(110,44,44,0.40)",
                backdropFilter: "blur(12px) saturate(1.4)",
                WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                border: "1px solid rgba(230,190,180,0.45)",
                boxShadow: "0 8px 24px rgba(35,15,14,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
              }}
              className="w-44 rounded-full px-6 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 ease-lux hover:-translate-y-0.5 focus:outline-none"
            >
              מצאי שמלה
            </button>
            <button
              type="button"
              onClick={onPublish}
              style={{
                background: "rgba(110,44,44,0.22)",
                backdropFilter: "blur(12px) saturate(1.4)",
                WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 8px 24px rgba(35,15,14,0.25), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
              className="w-44 rounded-full px-6 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 ease-lux hover:-translate-y-0.5 focus:outline-none"
            >
              פרסמי שמלה
            </button>
          </div>
        </div>
      </section>

      {/* Desktop hero — unchanged, hidden on mobile */}
      <section className="relative hidden min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6 text-center md:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 12%, rgba(139,58,58,0.10) 0%, transparent 68%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          השכרת שמלות ערב · ישראל
        </p>
        <div className="mb-7 h-px w-9 bg-brand/70" />
        <h1 className="font-display text-display font-light text-ink">השמלה המושלמת</h1>
        <h1 className="mt-1 font-display text-display font-light italic text-brand">
          לערב הגדול שלך
        </h1>
        <p className="mx-auto mt-7 max-w-md text-base font-light leading-relaxed text-ink/70">
          מאות שמלות ערב להשכרה מנשים בכל הארץ. שמלה אחת, ערב אחד, זיכרון לכל החיים.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBrowse}
            className="rounded-sm bg-brand px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 ease-lux hover:bg-brand-dark hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(139,58,58,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            מצאי שמלה
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="rounded-sm border border-ink/25 px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition-all duration-200 ease-lux hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            פרסמי שמלה
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onBrowse}
        aria-label="גלילה לשמלות"
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-muted transition-colors hover:text-brand"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="animate-bob">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </section>
    </>
  );
}

/* ============================================================
   4 · Filter Sidebar  (collapsible · grouped · RTL right side)
   ============================================================ */
/* Collapsible accordion section — open by default, fuchsia accents */
function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <span style={{ color: "rgba(243,233,230,0.7)" }}>{icon}</span>
          <span
            style={{
              fontFamily: "'Jost','Assistant',system-ui,sans-serif",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "rgba(243,233,230,0.72)",
            }}
          >
            {title}
          </span>
        </span>
        <Icon.chevron
          width="16"
          height="16"
          style={{
            color: "rgba(243,233,230,0.7)",
            transition: "transform .25s ease",
            transform: open ? "rotate(0deg)" : "rotate(180deg)",
          }}
        />
      </button>
      <div className={open ? "pb-5" : "hidden"}>{children}</div>
    </div>
  );
}

/* Pill button — cream when unselected, fuchsia when selected */
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: "'Jost','Assistant',system-ui,sans-serif",
        fontSize: "13px",
        backgroundColor: active ? "#C9897F" : "rgba(255,255,255,0.07)",
        border: active ? "1px solid #D9A99F" : "1px solid rgba(255,255,255,0.18)",
        color: active ? "#3A1E1C" : "#F3E9E6",
      }}
      className="rounded-full px-4 py-2 transition-all duration-200 ease-lux focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0]"
    >
      {children}
    </button>
  );
}

function PriceRange({ min, max, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div
        className="mb-3 text-center"
        style={{
          fontFamily: "'Jost','Assistant',system-ui,sans-serif",
          fontSize: "14px",
          letterSpacing: "0.5px",
          color: "#E6B9B0",
        }}
      >
        עד ₪{value}
      </div>
      <input
        type="range"
        className="price-slider"
        min={min}
        max={max}
        step="10"
        value={value}
        aria-label="מחיר מקסימלי"
        dir="rtl"
        onChange={(e) => onChange(+e.target.value)}
        style={{
          display: "block",
          width: "100%",
          height: "14px",
          margin: "8px 0",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.18)",
          WebkitAppearance: "none",
          appearance: "none",
          backdropFilter: "blur(8px) saturate(1.3)",
          WebkitBackdropFilter: "blur(8px) saturate(1.3)",
          background: `linear-gradient(to left, #C9897F 0%, #E6B9B0 ${pct}%, rgba(255,255,255,0.16) ${pct}%, rgba(255,255,255,0.16) 100%)`,
        }}
      />
    </div>
  );
}

/* Letter sizes only — numeric sizes removed from the filter UI to reduce clutter */
const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function FilterContent({ f, setF }) {
  const toggleArr = (key, val) =>
    setF((p) => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter((x) => x !== val) : [...p[key], val],
    }));

  return (
    <div className="flex flex-col">
      {/* 1 · SIZE — most important */}
      <Section title="גודל" icon={<Icon.ruler width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {LETTER_SIZES.map((s) => (
            <Chip key={s} active={f.sizes.includes(s)} onClick={() => toggleArr("sizes", s)}>
              {s}
            </Chip>
          ))}
        </div>
        <p
          className="mt-3"
          style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontSize: "11px", color: "rgba(243,233,230,0.45)" }}
        >
          לחצי על מידה לפרטים
        </p>
      </Section>

      {/* 2 · PRICE */}
      <Section title="מחיר" icon={<Icon.tag width="15" height="15" />}>
        <PriceRange
          min={50}
          max={500}
          value={f.maxPrice}
          onChange={(v) => setF((p) => ({ ...p, maxPrice: v }))}
        />
      </Section>

      {/* 3 · COLOR — frosted-glass pills, each tinted in its own color */}
      <Section title="צבע" icon={<Icon.palette width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((c) => {
            const active = f.color === c.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={active}
                onClick={() => setF((p) => ({ ...p, color: active ? "" : c.name }))}
                style={{
                  fontFamily: "'Jost','Assistant',system-ui,sans-serif",
                  fontSize: "12.5px",
                  background: hexToRgba(c.hex, active ? 0.55 : 0.26),
                  backdropFilter: "blur(8px) saturate(1.3)",
                  WebkitBackdropFilter: "blur(8px) saturate(1.3)",
                  border: active ? "1px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.22)",
                  boxShadow: active
                    ? `0 4px 14px ${hexToRgba(c.hex, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.25)`
                    : "inset 0 1px 0 rgba(255,255,255,0.12)",
                  color: "#F7ECE9",
                }}
                className="flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-all duration-200 ease-lux hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0]"
              >
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: c.hex,
                    border: "1px solid rgba(255,255,255,0.45)",
                    flex: "0 0 auto",
                  }}
                />
                {c.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 4 · SOURCE — "הכל" selected by default */}
      <Section title="מקור" icon={<Icon.store width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "הכל"],
            ["תפירה אישית", "תפירה אישית"],
            ["שם חנות", "בוטיק / חנות"],
          ].map(([v, l]) => (
            <Chip key={v} active={f.source === v} onClick={() => setF((p) => ({ ...p, source: v }))}>
              {l}
            </Chip>
          ))}
        </div>
      </Section>

      {/* 5 · CONDITION — least important */}
      <Section title="מצב השמלה" icon={<Icon.sparkle width="15" height="15" />}>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <Chip key={c} active={f.conditions.includes(c)} onClick={() => toggleArr("conditions", c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function activeFilterCount(f) {
  return (
    f.regions.length +
    f.sizes.length +
    f.conditions.length +
    (f.source !== "all" ? 1 : 0) +
    (f.color ? 1 : 0) +
    (f.q ? 1 : 0) +
    (f.minPrice > 50 || f.maxPrice < 500 ? 1 : 0)
  );
}

export const EMPTY_FILTERS = {
  q: "",
  color: "",
  minPrice: 50,
  maxPrice: 500,
  regions: [],
  sizes: [],
  lengths: [],
  conditions: [],
  source: "all",
};

/* Shared header (title · reset link · close) + gradient CTA used by the panel */
function ResetLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontSize: "12px", color: "rgba(243,233,230,0.6)" }}
      className="underline-offset-2 hover:underline"
    >
      איפוס הכל
    </button>
  );
}

/* Round, centered, burgundy-glass search button */
function SearchButton({ resultCount, onClick }) {
  return (
    <div className="flex flex-col items-center pt-1">
      <button
        type="button"
        onClick={onClick}
        aria-label="חיפוש"
        style={{
          width: "180px",
          height: "56px",
          background: "linear-gradient(145deg, rgba(139,58,58,0.95), rgba(110,44,44,0.95))",
          border: "1px solid rgba(230,185,176,0.45)",
          boxShadow: "0 12px 30px rgba(40,18,16,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: "#F7ECE9",
        }}
        className="group flex items-center justify-center gap-2 rounded-full transition-all duration-300 ease-lux hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-8px_rgba(139,58,58,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B9B0] focus-visible:ring-offset-0"
      >
        <Icon.search width="20" height="20" />
        <span style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontSize: "14px", letterSpacing: "1px" }}>
          חיפוש
        </span>
      </button>
      <span
        className="mt-3"
        style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontSize: "12px", color: "rgba(243,233,230,0.6)" }}
      >
        <span key={resultCount} className="count-pulse">{resultCount}</span> שמלות
      </span>
    </div>
  );
}

export function FilterSidebar({ f, setF, resultCount }) {
  const [open, setOpen] = useState(false);
  const [panelIn, setPanelIn] = useState(false);
  const count = activeFilterCount(f);
  const clearAll = () => setF({ ...EMPTY_FILTERS });

  const openModal = () => {
    setOpen(true);
    requestAnimationFrame(() => setPanelIn(true));
  };
  const closeModal = () => {
    setPanelIn(false);
    setTimeout(() => setOpen(false), 320);
  };

  return (
    <>
      {/* Floating trigger — burgundy frosted glass, centered at the bottom */}
      <button
        type="button"
        onClick={openModal}
        style={{
          background: "rgba(74,38,35,0.6)",
          backdropFilter: "blur(16px) saturate(1.4)",
          WebkitBackdropFilter: "blur(16px) saturate(1.4)",
          border: "1px solid rgba(230,190,180,0.28)",
          boxShadow: "0 10px 30px rgba(35,15,14,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
      >
        <Icon.slider width="18" height="18" />
        <span className="inline-flex items-baseline gap-1">
          סינון
          {count > 0 && (
            <span className="text-xs font-bold" style={{ color: "#E6B9B0" }}>
              {count}
            </span>
          )}
        </span>
      </button>

      {/* Centered floating frosted-glass card */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* overlay — click to close */}
          <div
            onClick={closeModal}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(30,14,13,0.45)",
              opacity: panelIn ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
          {/* glass card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="סינון שמלות"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "440px",
              maxHeight: "86vh",
              background: "linear-gradient(160deg, rgba(86,42,39,0.62), rgba(58,28,26,0.66))",
              backdropFilter: "blur(28px) saturate(1.3)",
              WebkitBackdropFilter: "blur(28px) saturate(1.3)",
              border: "1px solid rgba(230,190,180,0.22)",
              boxShadow: "0 30px 70px rgba(35,15,14,0.55)",
              borderRadius: "24px",
              opacity: panelIn ? 1 : 0,
              transform: panelIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.97)",
              transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
            }}
            className="flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 pt-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="flex items-baseline gap-3">
                <h2 style={{ fontFamily: "'Jost','Assistant',system-ui,sans-serif", fontWeight: 600, fontSize: "20px", letterSpacing: "0.5px", color: "#F7ECE9" }}>
                  סינון
                </h2>
                <ResetLink onClick={clearAll} />
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="סגירה"
                style={{ background: "rgba(255,255,255,0.07)", color: "#F7ECE9" }}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.14)] focus:outline-none"
              >
                <Icon.close width="18" height="18" className="block" />
              </button>
            </div>

            {/* Scrollable filters */}
            <div
              className="glass-scroll flex-1 px-6 py-4"
              style={{ overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <FilterContent f={f} setF={setF} />
            </div>

            {/* Centered round search button */}
            <div className="px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              <SearchButton resultCount={resultCount} onClick={closeModal} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   5 · Product Card  (3:4 · hover overlay · availability dot)
   ============================================================ */
export function ProductCard({ d, fav, onFav, onOpen }) {
  return (
    <article onClick={() => onOpen(d)} className="group cursor-pointer">
      {/* Image — dominant element, subtle hover zoom */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Img
          src={d.images[0]}
          color={d.colorHex}
          label={d.title}
          className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
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
            fill={fav ? "#8B3A3A" : "none"}
            stroke={fav ? "#8B3A3A" : "#1a1a1a"}
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
      <div className="px-1 pt-4 text-start">
        {/* Dress name — Jost (matched to size label), normal weight, full width */}
        <h3 style={{
          fontFamily: "'Jost', 'Assistant', system-ui, sans-serif",
          fontWeight: 400,
          fontStyle: "normal",
          fontSize: "19px",
          color: "#1a1a1a",
          lineHeight: "1.2",
        }} className="line-clamp-1">
          {d.title}
        </h3>

        {/* Size — uppercase tracking, muted gray */}
        <p style={{
          fontFamily: "'Jost', 'Assistant', system-ui, sans-serif",
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#999",
          marginTop: "7px",
        }}>
          מידה {d.size}
        </p>

        {/* Price — Jost, letter-spaced, with lighter per-rental label */}
        <p style={{ marginTop: "9px" }}>
          <span style={{
            fontFamily: "'Jost', 'Assistant', system-ui, sans-serif",
            fontWeight: 500,
            fontSize: "13px",
            letterSpacing: "0.04em",
            color: "#1a1a1a",
          }}>
            ₪{d.price}
          </span>
          <span style={{
            fontFamily: "'Jost', 'Assistant', system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "12px",
            letterSpacing: "0.03em",
            color: "#999",
            marginInlineStart: "6px",
          }}>
            / לערב
          </span>
        </p>
      </div>
    </article>
  );
}

/* ============================================================
   6 · Product Grid  (4 / 2 / 1 responsive)
   ============================================================ */
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
      {dresses.map((d, i) => (
        <motion.div
          key={d.id}
          initial={cardReveal.initial}
          whileInView={cardReveal.whileInView}
          viewport={cardReveal.viewport}
          transition={{
            duration: 1.15,
            ease: cardEase,
            delay: (i % 4) * 0.12, // gentle stagger across each row
          }}
        >
          <ProductCard d={d} fav={favIds.includes(d.id)} onFav={onFav} onOpen={onOpen} />
        </motion.div>
      ))}
    </div>
  );
}

/* ============================================================
   Calendar grids
   ============================================================ */
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DOW = ["א","ב","ג","ד","ה","ו","ש"];

function MonthGrid({ year, month, booked, selStart, selEnd, onPick }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const keyFor = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="w-full">
      <p className="mb-3 text-center font-display text-lg text-ink">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = keyFor(d);
          const date = new Date(year, month, d);
          const isPast = date < today;
          const isBooked = booked.includes(k);
          const disabled = isPast || isBooked;
          const inRange = selStart && selEnd && k >= selStart && k <= selEnd;
          const isEdge = k === selStart || k === selEnd;

          let cls = "relative grid h-9 place-items-center rounded-full text-sm transition-colors duration-150 ";
          if (disabled) {
            cls += "cursor-not-allowed text-muted/50 line-through";
          } else if (isEdge) {
            cls += "cursor-pointer bg-brand font-semibold text-white";
          } else if (inRange) {
            cls += "cursor-pointer bg-brand-light text-brand";
          } else {
            cls += "cursor-pointer text-ink hover:bg-brand-light";
          }

          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onPick(k)}
              aria-label={disabled ? `${k} לא זמין` : k}
              className={cls}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({ booked = [], value, onChange }) {
  const [base, setBase] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), mo: d.getMonth() };
  });
  const next = useMemo(() => {
    let mo = base.mo + 1, y = base.y;
    if (mo > 11) { mo = 0; y++; }
    return { y, mo };
  }, [base]);

  const shift = (n) =>
    setBase((p) => {
      let mo = p.mo + n, y = p.y;
      if (mo < 0) { mo = 11; y--; }
      if (mo > 11) { mo = 0; y++; }
      return { y, mo };
    });

  const pick = (k) => {
    const { start, end } = value;
    if (!start || (start && end)) {
      onChange({ start: k, end: null });
    } else if (k < start) {
      onChange({ start: k, end: null });
    } else {
      onChange({ start, end: k });
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="חודש קודם" className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">
          ›
        </button>
        <button type="button" onClick={() => shift(1)} aria-label="חודש הבא" className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">
          ‹
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <MonthGrid year={base.y} month={base.mo} booked={booked} selStart={value.start} selEnd={value.end} onPick={pick} />
        <div className="hidden sm:block">
          <MonthGrid year={next.y} month={next.mo} booked={booked} selStart={value.start} selEnd={value.end} onPick={pick} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand" /> נבחר</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand-light" /> טווח</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-line bg-white" /> פנוי</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-line line-through" /> תפוס</span>
      </div>
    </div>
  );
}

export function Calendar({ booked = [], editable = false, onToggle }) {
  const [m, setM] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), mo: d.getMonth() };
  });
  const first = new Date(m.y, m.mo, 1).getDay();
  const days = new Date(m.y, m.mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const key = (d) =>
    `${m.y}-${String(m.mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (n) =>
    setM((p) => {
      let mo = p.mo + n, y = p.y;
      if (mo < 0) { mo = 11; y--; }
      if (mo > 11) { mo = 0; y++; }
      return { y, mo };
    });

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="חודש קודם" className="grid h-7 w-7 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">›</button>
        <span className="font-display text-base text-ink">{MONTHS[m.mo]} {m.y}</span>
        <button type="button" onClick={() => shift(1)} aria-label="חודש הבא" className="grid h-7 w-7 place-items-center rounded-full border border-line text-ink hover:border-brand hover:text-brand">‹</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = key(d);
          const isBooked = booked.includes(k);
          let cls = "grid h-8 place-items-center rounded-full text-sm transition-colors ";
          if (isBooked) cls += "bg-brand text-white ";
          else cls += "text-ink ";
          if (editable) cls += "cursor-pointer hover:bg-brand-light ";
          return (
            <button
              type="button"
              key={i}
              onClick={editable ? () => onToggle(k) : undefined}
              disabled={!editable}
              aria-pressed={isBooked}
              className={cls}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-line bg-white" /> פנוי</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-brand" /> תפוס</span>
        {editable && <span className="text-brand">לחצי לסימון</span>}
      </div>
    </div>
  );
}

/* ============================================================
   7 · Product Modal  (split 60/40 · internal scroll · calendar)
   ============================================================ */
export function DetailModal({ d, fav, onFav, onClose, toast }) {
  const [idx, setIdx] = useState(0);
  const [range, setRange] = useState({ start: null, end: null });

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, []);

  const link = location.origin + location.pathname + "#dress=" + d.id;
  const datePhrase = range.start
    ? ` לתאריכים ${range.start}${range.end ? " עד " + range.end : ""}`
    : "";
  const wa = `https://wa.me/972${d.phone.replace(/^0/, "")}?text=${encodeURIComponent(
    `היי! אשמח לבקש השאלה של השמלה "${d.title}"${datePhrase} ב-onenight 🌸`
  )}`;
  const copy = () => {
    navigator.clipboard?.writeText(link);
    toast && toast("הקישור הועתק 🔗");
  };

  const meta = [
    { icon: Icon.pin, label: "אזור", value: d.region },
    { icon: Icon.ruler, label: "מידה", value: d.size },
    { icon: Icon.sparkle, label: "מצב", value: d.condition },
    { icon: Icon.store, label: "מקור", value: d.source === "שם חנות" ? d.store || "בוטיק" : d.source },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-stretch justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full animate-scale-in flex-col overflow-hidden bg-canvas shadow-modal sm:h-auto sm:max-h-[90vh] sm:w-[90vw] sm:max-w-5xl sm:rounded-md md:flex-row-reverse"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="absolute left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-ink backdrop-blur transition-colors hover:bg-white"
        >
          <Icon.close width="18" height="18" />
        </button>

        <div className="relative w-full shrink-0 bg-brand-light/40 md:w-[58%]">
          <div className="relative aspect-[3/4] h-56 w-full sm:h-72 md:h-full md:aspect-auto">
            <Img
              src={d.images[idx]}
              color={d.colorHex}
              label={d.title}
              className="h-full w-full object-cover"
            />
          </div>
          {d.images.length > 1 && (
            <>
              <button type="button" onClick={() => setIdx((i) => (i + 1) % d.images.length)} aria-label="הקודם" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink backdrop-blur hover:bg-white">›</button>
              <button type="button" onClick={() => setIdx((i) => (i - 1 + d.images.length) % d.images.length)} aria-label="הבא" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink backdrop-blur hover:bg-white">‹</button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {d.images.map((_, i) => (
                  <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`תמונה ${i + 1}`} className={"h-1.5 rounded-full transition-all " + (i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60")} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lux-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-7 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {d.region} · {d.condition}
          </p>
          <h2 className="mt-1 font-display text-3xl text-ink">{d.title}</h2>
          <p className="mt-3 font-mono text-2xl font-medium text-ink">
            {"₪"}{d.price}
            <span className="text-base font-normal text-muted"> / לערב</span>
          </p>

          {d.desc && <p className="mt-4 text-base leading-relaxed text-ink/75">{d.desc}</p>}

          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-line py-5">
            {meta.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                  <m.icon width="17" height="17" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] uppercase tracking-[0.1em] text-muted">{m.label}</span>
                  <span className="block truncate text-sm font-medium text-ink">{m.value}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-1 font-display text-xl text-ink">בחרי תאריכי השאלה</h3>
            <p className="mb-4 text-sm text-muted">
              {range.start
                ? range.end
                  ? `נבחר: ${range.start} עד ${range.end}`
                  : `התחלה: ${range.start} — בחרי תאריך סיום`
                : "לחצי על תאריך פנוי כדי להתחיל"}
            </p>
            <AvailabilityCalendar booked={d.booked} value={range} onChange={setRange} />
          </div>

          <div className="mt-7 flex flex-col gap-3 pb-1">
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              className="w-full rounded-sm bg-brand py-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              בקשי השאלה
            </a>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onFav(d.id)}
                className={
                  "flex-1 rounded-sm border py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 " +
                  (fav
                    ? "border-brand bg-brand-light text-brand"
                    : "border-ink/25 text-ink hover:border-brand hover:text-brand")
                }
              >
                {fav ? "♥ נשמר במועדפים" : "הוסיפי למועדפים"}
              </button>
              <button
                type="button"
                onClick={copy}
                aria-label="העתקת קישור"
                className="grid w-12 shrink-0 place-items-center rounded-sm border border-ink/25 text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Backwards-compatible alias so existing imports keep working */
export function DressCard({ d, fav, onFav, onOpen }) {
  return <ProductCard d={d} fav={fav} onFav={onFav} onOpen={onOpen} />;
}
