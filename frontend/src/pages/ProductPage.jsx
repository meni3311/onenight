import { useState, useRef, useMemo, useEffect } from "react";
import { Img } from "../components/ui/Img.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock.js";
import { withBase } from "../lib/api.js";

/* ============================================================================
   ProductPage — full dedicated dress page (mobile-first, RTL).
   Replaces the old DetailModal popup entirely. Rent-the-Runway × SSENSE feel:
   full-bleed gallery, editorial identity block, size + date selection,
   accordion details, reviews rail, similar dresses, sticky booking CTA.

   Props (same shape App already passes for the old modal, plus optional rail):
     d              — the dress object
     fav            — is this dress favorited
     onFav(id)      — toggle favorite
     onClose()      — back to the dress grid
     toast(msg)     — transient toast
     similar        — (optional) other dresses for the "you may also like" rail
     onOpenSimilar  — (optional) open another dress
============================================================================ */

/* ---- design tokens straight from the brief ---- */
const C = {
  cream: "#FDF8F5",
  fuchsia: "#E8457A",
  fuchsiaEnd: "#F06292",
  ink: "#1A1A1A",
  muted: "#999999",
  subtle: "#666666",
  divider: "#F0F0F0",
  white: "#FFFFFF",
  green: "#4CAF50",
  disabled: "#CCCCCC",
};
const SERIF = "'Cormorant Garamond','Frank Ruhl Libre',serif";
const UI = "'Jost','Assistant',system-ui,sans-serif";

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DOW = ["א","ב","ג","ד","ה","ו","ש"];
const STD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/* date helpers — keys are "YYYY-MM-DD" to match the stored `booked` array */
const keyOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
function rangeKeys(start, end) {
  if (!start) return [];
  if (!end) return [start];
  const out = [];
  const s = parseKey(start), e = parseKey(end);
  for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
    out.push(keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  }
  return out;
}
function fmtDay(k) { const d = parseKey(k); return `${d.getDate()} ב${HE_MONTHS[d.getMonth()]}`; }
function rangeSummary(start, end) {
  if (!start) return "";
  if (!end) return fmtDay(start);
  const s = parseKey(start), e = parseKey(end);
  const nights = daysBetween(start, end) + 1; // inclusive, per the brief's "15–17 | 3 לילות"
  const label =
    s.getMonth() === e.getMonth()
      ? `${s.getDate()}–${e.getDate()} ב${HE_MONTHS[s.getMonth()]}`
      : `${fmtDay(start)} – ${fmtDay(end)}`;
  return `${label} | ${nights} לילות`;
}

/* ---------------------------------------------------------------- Gallery */
function Gallery({ images, color, label, fav, onFav, onBack }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef(null);
  const n = images.length;
  const go = (i) => setIdx((i + n) % n);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      // RTL: swipe-left → next image, swipe-right → previous
      go(dx < 0 ? idx + 1 : idx - 1);
    }
    touchX.current = null;
  };

  return (
    <section className="op-gallery" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Img
        src={images[idx]}
        color={color}
        label={label}
        className="op-gallery-img"
      />

      <button type="button" className="op-glass op-glass-back" aria-label="חזרה לגלריית השמלות" onClick={onBack}>
        {/* RTL back = arrow pointing right */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <button type="button" className="op-glass op-glass-fav" aria-label={fav ? "הסרה ממועדפים" : "הוספה למועדפים"} aria-pressed={fav} onClick={onFav}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={fav ? C.fuchsia : "none"} stroke={fav ? C.fuchsia : "#fff"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {n > 1 && (
        <div className="op-dots">
          {images.map((_, i) => (
            <button key={i} type="button" aria-label={`תמונה ${i + 1}`} onClick={() => setIdx(i)}
              className="op-dot" style={{ background: i === idx ? C.fuchsia : "rgba(255,255,255,0.5)" }} />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- Calendar */
function Calendar({ booked, range, onPick }) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const shift = (n) => setView((p) => {
    let m = p.m + n, y = p.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    return { y, m };
  });

  const inRangeKeys = rangeKeys(range.start, range.end);
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="op-cal">
      <div className="op-cal-head">
        {/* RTL nav: right arrow = previous month, left arrow = next */}
        <button type="button" className="op-cal-nav" aria-label="חודש קודם" onClick={() => shift(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <span className="op-cal-title">{HE_MONTHS[view.m]} {view.y}</span>
        <button type="button" className="op-cal-nav" aria-label="חודש הבא" onClick={() => shift(1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>

      <div className="op-cal-grid">
        {HE_DOW.map((d) => <div key={d} className="op-cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = keyOf(view.y, view.m, d);
          const date = new Date(view.y, view.m, d);
          const disabled = date < today || booked.includes(k);
          const isEdge = k === range.start || k === range.end;
          const isMid = inRangeKeys.includes(k) && !isEdge;
          let cls = "op-cal-day";
          if (disabled) cls += " op-cal-day--off";
          else if (isEdge) cls += " op-cal-day--edge";
          else if (isMid) cls += " op-cal-day--mid";
          return (
            <button key={i} type="button" className={cls} disabled={disabled}
              aria-label={disabled ? `${k} לא זמין` : k} onClick={() => onPick(k)}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Accordion */
function AccordionRow({ title, children, open, onToggle }) {
  const bodyRef = useRef(null);
  return (
    <div className="op-acc-row">
      <button type="button" className="op-acc-head" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <svg className="op-acc-chev" data-open={open} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className="op-acc-body" style={{ maxHeight: open ? (bodyRef.current?.scrollHeight || 600) + "px" : "0px" }}>
        <div ref={bodyRef} className="op-acc-inner">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================== ProductPage */
export default function ProductPage({ d, fav, onFav, onClose, toast, similar = [], onOpenSimilar }) {
  const { isLoggedIn, account, openAuth } = useAuth();
  const [size, setSize] = useState(null);
  const [range, setRange] = useState({ start: null, end: null });
  const [openAcc, setOpenAcc] = useState(0);
  const [sizeGuide, setSizeGuide] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);

  /* App.jsx renders ProductPage *alongside* the home grid (App.jsx keeps
     `route === "home"` mounted underneath `{selected && <ProductPage/>}`)
     rather than swapping it out — .op-root's position:fixed only covers
     that content visually. Without this, body stays tall/scrollable behind
     the overlay, and the browser draws its native scrollbar for that
     hidden body scroll at the viewport edge (fixed positioning can't hide
     browser-chrome scrollbars), which read as a stray grey scrollbar on
     the left. useBodyScrollLock is the same hook the auth modal and mobile
     nav already use — this mirrors what the old DetailModal this page
     "replaces entirely" (see file header) used to do, which the migration
     dropped. */
  useBodyScrollLock(true);

  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [d?.id]);

  if (!d) return null;

  const images = d.images?.length ? d.images : [""];
  const booked = d.booked || [];
  const sellerLabel = d.source === "שם חנות" ? (d.store || "בוטיק") : (d.source || "תפירה אישית");

  /* this physical garment is a single size; that size is the only one in stock */
  const sizeList = STD_SIZES.includes(d.size) ? STD_SIZES : [...STD_SIZES, d.size];
  const isSizeAvailable = (s) => s === d.size;

  const pickDate = (k) => {
    setRange((p) => {
      if (!p.start || (p.start && p.end)) return { start: k, end: null };
      if (k < p.start) return { start: k, end: null };
      return { start: p.start, end: k };
    });
  };

  /* availability indicator — dynamic on the selected range.
     A single clicked day (no end date chosen yet) is a valid same-day
     rental on its own; a second click on a later day extends it into a
     multi-day range. Either way `end` defaults to `start`. */
  const hasDates = Boolean(range.start);
  const effectiveEnd = range.end || range.start;
  const conflict = hasDates && rangeKeys(range.start, effectiveEnd).some((k) => booked.includes(k));
  const availability = !hasDates
    ? { tone: "neutral", text: "בחרי תאריכים כדי לבדוק זמינות" }
    : conflict
      ? { tone: "no", text: "לא פנויה" }
      : { tone: "yes", text: "פנויה לתאריכים שבחרת" };

  const canBook = !!size && hasDates && !conflict;

  /* Fire-and-forget: logs this click for the admin's booking-inquiries
     page (see backend/src/booking-inquiries). Deliberately doesn't await
     or block on this — a failed/slow log must never delay or break the
     WhatsApp flow below, which is the actual user-facing behavior and is
     untouched. Goes straight to the real backend via fetch() rather than
     the api() helper (same as AuthContext's calls), but still routed
     through withBase() so it reaches the right origin once frontend and
     backend are deployed separately (Vercel/Render) instead of assuming
     same-origin. */
  const logBookingInquiry = () => {
    if (!account?.id) return; // isLoggedIn is already required to reach this point; belt-and-suspenders
    fetch(withBase("/api/booking-inquiries"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renterId: account.id,
        renterPhone: account.phone || "",
        dressId: d.id,
        dressTitle: d.title,
        ownerPhone: d.phone || "",
        selectedStartDate: range.start,
        selectedEndDate: effectiveEnd,
      }),
    }).catch(() => { /* logging failure shouldn't surface to the renter */ });
  };

  const book = () => {
    if (!canBook) return;
    if (!isLoggedIn) {
      setAuthPrompt(true);
      return;
    }
    logBookingInquiry();
    const datePhrase = ` לתאריכים ${rangeSummary(range.start, effectiveEnd)}`;
    const wa = `https://wa.me/972${(d.phone || "").replace(/^0/, "")}?text=${encodeURIComponent(
      `היי! אשמח להזמין את השמלה "${d.title}" במידה ${size}${datePhrase} דרך-onenight \u{1F337}`
    )}`;
    window.open(wa, "_blank", "noopener");
    toast && toast("פותחים את בקשת ההזמנה 🌸");
  };

  return (
    <div className="op-root" dir="rtl">
      <style>{CSS}</style>

      <div className="op-scroll">
        {/* SECTION 1 — full-bleed gallery */}
        <div className="op-anim" style={{ animationDelay: "0ms" }}>
          <Gallery images={images} color={d.colorHex} label={d.title} fav={fav} onFav={() => onFav(d.id)} onBack={onClose} />
        </div>

        {/* SECTION 2 — identity */}
        <section className="op-sec op-anim" style={{ animationDelay: "80ms" }}>
          <h1 className="op-name">{d.title}</h1>
          <p className="op-seller">{sellerLabel}</p>
          <p className="op-price">₪{d.price} <span>/ לערב</span></p>
          <div className="op-avail" data-tone={availability.tone}>
            <span className="op-avail-dot" />
            {availability.text}
          </div>
        </section>

        {/* SECTION 3 — size */}
        <section className="op-sec op-anim" style={{ animationDelay: "160ms" }}>
          <p className="op-label">בחרי מידה</p>
          <div className="op-sizes">
            {sizeList.map((s) => {
              const avail = isSizeAvailable(s);
              const selected = size === s;
              return (
                <button key={s} type="button" disabled={!avail}
                  className={"op-size" + (selected ? " op-size--on" : "") + (avail ? "" : " op-size--off")}
                  onClick={() => avail && setSize(s)}>
                  {s}
                </button>
              );
            })}
          </div>
          <button type="button" className="op-sizeguide" onClick={() => setSizeGuide(true)}>מה המידה שלי?</button>
        </section>

        {/* SECTION 4 — dates */}
        <section className="op-sec op-anim" style={{ animationDelay: "240ms" }}>
          <p className="op-label">בחרי תאריכי השכרה</p>
          <Calendar booked={booked} range={range} onPick={pickDate} />
          {range.start && <p className="op-range-summary">{rangeSummary(range.start, range.end)}</p>}
        </section>

        {/* SECTION 5 — details accordion */}
        <section className="op-sec op-anim" style={{ animationDelay: "320ms" }}>
          <AccordionRow title="פרטי השמלה" open={openAcc === 0} onToggle={() => setOpenAcc(openAcc === 0 ? -1 : 0)}>
            {d.desc && <p>{d.desc}</p>}
            <p>צבע: {d.color || "—"}</p>
            <p>מקור: {sellerLabel}</p>
            <p>מצב: {d.condition || "—"}</p>
            <p>אזור: {d.region || "—"}</p>
            <p>עיר: {d.city || "—"}</p>
          </AccordionRow>
          <AccordionRow title="מדיניות השכרה" open={openAcc === 1} onToggle={() => setOpenAcc(openAcc === 1 ? -1 : 1)}>
            <p>איסוף השמלה מתואם ישירות מול בעלת השמלה לאחר אישור ההזמנה. ההחזרה עד השעה 20:00 ביום שלאחר תום תקופת ההשכרה.</p>
          </AccordionRow>
          <AccordionRow title="מדיניות ביטול" open={openAcc === 2} onToggle={() => setOpenAcc(openAcc === 2 ? -1 : 2)}>
            <p>מול המשכירה.</p>
          </AccordionRow>
          <AccordionRow title="שאלות ותשובות" open={openAcc === 3} onToggle={() => setOpenAcc(openAcc === 3 ? -1 : 3)}>
            <p><strong>אפשר למדוד לפני?</strong> כן, אפשר לתאם מדידה מול בעלת השמלה.</p>
            <p><strong>מי אחראית על הניקוי?</strong> השמלה נמסרת נקייה ומוחזרת לאחר נקיה למראה. כתמים חריגים יחוייבו בניקוי יבש.</p>
            <p><strong>יש פיקדון?</strong> ייתכן פיקדון קטן שנקבע מול בעלת השמלה ומוחזר בעת ההחזרה.</p>
          </AccordionRow>
        </section>

        {/* SECTION 6 — reviews — REMOVED (deferred feature, see below near
            the REVIEWS const for details). Re-enable by uncommenting this
            block; nothing else references it.
        <section className="op-sec op-sec--reviews op-anim" style={{ animationDelay: "400ms" }}>
          <h2 className="op-h2">מה אמרו עליה</h2>
          <div className="op-reviews">
            {REVIEWS.map((r, i) => (
              <article key={i} className="op-review">
                <div className="op-review-top">
                  <span className="op-review-name">{r.name}</span>
                  <span className="op-stars">{"★".repeat(r.stars)}</span>
                </div>
                <p className="op-review-text">{r.text}</p>
                <span className="op-review-size">מידה {r.size}</span>
              </article>
            ))}
          </div>
        </section>
        */}

        {/* SECTION 7 — similar */}
        {similar.length > 0 && (
          <section className="op-sec op-anim" style={{ animationDelay: "480ms" }}>
            <h2 className="op-h2">אולי תאהבי גם</h2>
            <div className="op-similar">
              {similar.slice(0, 6).map((s) => (
                <button key={s.id} type="button" className="op-sim-card" onClick={() => onOpenSimilar && onOpenSimilar(s)}>
                  <Img src={s.images?.[0]} color={s.colorHex} label={s.title} className="op-sim-img" />
                  <span className="op-sim-name">{s.title}</span>
                  <span className="op-sim-price">₪{s.price}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="op-cta-spacer" />
      </div>

      {/* STICKY BOTTOM CTA */}
      <div className="op-cta">
        <span className="op-cta-price">₪{d.price} <span>/ לערב</span></span>
        <button type="button" className={"op-cta-btn" + (canBook ? "" : " op-cta-btn--off")} disabled={!canBook} onClick={book}>
          {canBook ? "להזמנה" : "בחרי מידה ותאריך"}
        </button>
      </div>

      {/* size guide modal */}
      {sizeGuide && (
        <div className="op-modal-overlay" onClick={() => setSizeGuide(false)}>
          <div className="op-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="op-modal-x" aria-label="סגירה" onClick={() => setSizeGuide(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <h3 className="op-modal-title">מדריך מידות</h3>
            <table className="op-size-table">
              <thead><tr><th>מידה</th><th>חזה (ס״מ)</th><th>מותן (ס״מ)</th></tr></thead>
              <tbody>
                <tr><td>XS</td><td>78–82</td><td>60–64</td></tr>
                <tr><td>S</td><td>83–87</td><td>65–69</td></tr>
                <tr><td>M</td><td>88–92</td><td>70–74</td></tr>
                <tr><td>L</td><td>93–98</td><td>75–80</td></tr>
                <tr><td>XL</td><td>99–104</td><td>81–86</td></tr>
                <tr><td>XXL</td><td>105–110</td><td>87–92</td></tr>
              </tbody>
            </table>
            <p className="op-modal-note">במקרה של התלבטות בין שתי מידות, מומלץ לבחור את הגדולה מביניהן.</p>
          </div>
        </div>
      )}

      {/* auth gate — shown instead of the WhatsApp flow for signed-out users.
          Styled to match AuthContext's own modal exactly (same dark-glass
          card, bordeaux/rose/cream palette, Assistant body copy) rather
          than this page's own fuchsia/white modal system, since this is
          effectively a preview step for that same modal. */}
      {authPrompt && (
        <div
          onClick={() => setAuthPrompt(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="נדרשת הרשמה"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "320px",
              padding: "36px 28px",
              textAlign: "center",
              color: "#fff",
              background: "rgba(42, 31, 31, 0.75)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(196, 160, 160, 0.2)",
              borderRadius: "20px",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
            }}
          >
            <button
              type="button"
              onClick={() => setAuthPrompt(false)}
              aria-label="סגירה"
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                background: "transparent",
                border: "none",
                padding: "2px",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            {/* same lock glyph the auth modal opens on */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A0A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 20px" }}>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>

            <h3 style={{ fontFamily: "'Frank Ruhl Libre','Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 500, fontSize: "1.3rem", color: "#fff", margin: 0 }}>
              כמעט שם
            </h3>
            <p style={{ fontFamily: "'Assistant',sans-serif", marginTop: "10px", fontSize: "0.85rem", lineHeight: 1.6, color: "rgba(255,255,255,0.65)" }}>
              לצורך אימות וקבלת הפרטים, יש להירשם — זה לוקח בדיוק דקה.
            </p>

            <button
              type="button"
              onClick={() => {
                setAuthPrompt(false);
                openAuth();
              }}
              style={{
                marginTop: "24px",
                width: "100%",
                borderRadius: "999px",
                padding: "12px 0",
                fontFamily: "'Assistant',sans-serif",
                fontSize: "0.95rem",
                color: "#fff",
                background: "#6B2D2D",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#5A2424"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#6B2D2D"; }}
            >
              המשך להרשמה או התחברות
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reviews UI removed (deferred feature — see SECTION 6 above, commented out).
   This sample data was always presentational only: the real Review model
   (backend/prisma/schema.prisma) exists but has no NestJS controller/service
   wired to it yet, and nothing in this app ever fetched real reviews — so
   there's no live data to preserve here, just this hardcoded array. Left
   commented rather than deleted so re-enabling SECTION 6 is a pure uncomment.
const REVIEWS = [
  { name: "נועה ל.", stars: 5, size: "M", text: "השמלה הייתה מושלמת, בדיוק כמו בתמונות. קיבלתי המון מחמאות בערב." },
  { name: "שיר כ.", stars: 5, size: "S", text: "איכות מדהימה והתהליך היה פשוט וזורם. אשכיר שוב בשמחה." },
  { name: "דנה מ.", stars: 4, size: "L", text: "שמלה יפהפייה ונוחה. הגיעה נקייה ומגוהצת, מומלץ בחום." },
];
*/

/* ------------------------------------------------------------------- CSS */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');

.op-root{position:fixed;inset:0;z-index:120;direction:rtl;background:${C.cream};
  font-family:${UI};color:${C.ink};display:flex;flex-direction:column;}
.op-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;}
.op-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
.op-root *{box-sizing:border-box;}

/* entrance + stagger */
@keyframes opFadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.op-anim{opacity:0;animation:opFadeUp .4s ease-out forwards;}
@media (prefers-reduced-motion:reduce){.op-anim{opacity:1;animation:none;}}

/* SECTION 1 — gallery */
.op-gallery{position:relative;width:100%;height:75vh;overflow:hidden;background:${C.cream};}
.op-gallery-img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;}
.op-glass{position:absolute;top:16px;width:44px;height:44px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;
  background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,0.2);box-shadow:0 4px 16px rgba(0,0,0,0.08);
  transition:transform .2s ease;}
.op-glass:hover{transform:scale(1.06);}
/* Swapped: back sits top-right, favourite top-left. These are physical
   left/right (not inset-inline) so they don't flip with the page's RTL
   direction — changing the values here is the whole swap, and both buttons
   keep their own styling and behaviour. */
.op-glass-back{right:16px;}
.op-glass-fav{left:16px;}
.op-dots{position:absolute;bottom:16px;left:0;right:0;display:flex;justify-content:center;gap:7px;}
.op-dot{width:7px;height:7px;border-radius:50%;border:none;padding:0;cursor:pointer;transition:transform .2s;}
.op-dot:hover{transform:scale(1.2);}

/* Wide desktop: this page is mobile-first (full-bleed 100vw x 75vh gallery),
   so on a wide screen the gallery box becomes an ultra-wide letterbox
   (e.g. ~1920x810) that bears no resemblance to a portrait dress photo's
   proportions — 'cover' was cropping most of the photo away. Cap the
   gallery to a portrait-ish column with a 3/4 aspect ratio and switch to
   'contain' so the full photo is always visible, instead of stretching the
   crop across the whole viewport width. Mobile/tablet keep the original
   full-bleed 75vh treatment untouched. */
@media (min-width:1025px){
  /* The frame shrink-wraps the photo instead of imposing a fixed 3/4 box.
     Fixing the height and letting width follow the image's natural aspect
     means the element's box IS the photo — no letterboxing, whatever the
     photo's proportions.

     This replaces an earlier attempt that used a fixed 'aspect-ratio:3/4'
     with 'object-fit:contain'. That showed the whole photo (the point), but
     any dress narrower than 3/4 left empty bands at the sides, and the
     absolutely-positioned icons below sat on those bands rather than on the
     image. Nudging their inset inward was treating the symptom: no fixed
     value works, because the band width depends on each photo's aspect.
     With the box hugging the image, a small inset is inside the frame by
     construction.

     max-width:100% is a guard for an unusually wide (landscape) photo,
     which would otherwise overflow; object-fit:contain keeps it undistorted
     if that clamp ever engages. */
  .op-gallery{width:fit-content;max-width:100%;height:auto;margin:0 auto;}
  .op-gallery-img{
    width:auto;
    height:min(78vh, 760px);
    max-width:100%;
    object-fit:contain;
  }

  /* A modest inset from the photo's own edges. Mobile keeps its 16px and is
     untouched — there the image uses 'cover' and fills the box edge to
     edge, so the icons already sit on the photo. */
  .op-glass{top:20px;}
  .op-glass-back{right:20px;}
  .op-glass-fav{left:20px;}
}

/* shared section shell */
.op-sec{background:${C.white};padding:24px;border-bottom:1px solid ${C.divider};}
.op-label{font-family:${UI};font-size:11px;font-weight:500;text-transform:uppercase;
  letter-spacing:2px;color:${C.muted};margin:0 0 14px;}
.op-h2{font-family:${SERIF};font-size:20px;font-weight:500;color:${C.ink};margin:0 0 16px;}

/* SECTION 2 — identity */
.op-name{font-family:${SERIF};font-size:26px;font-weight:500;color:${C.ink};margin:0;line-height:1.2;}
.op-seller{font-family:${UI};font-size:11px;font-weight:400;text-transform:uppercase;
  letter-spacing:2px;color:${C.muted};margin:8px 0 0;}
.op-price{font-family:${UI};font-size:22px;font-weight:700;color:${C.fuchsia};margin:14px 0 0;}
.op-price span{font-size:14px;font-weight:400;color:${C.fuchsia};}
.op-avail{display:flex;align-items:center;gap:8px;margin-top:14px;font-family:${UI};font-size:12px;}
.op-avail-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}
.op-avail[data-tone="yes"]{color:${C.green};}
.op-avail[data-tone="yes"] .op-avail-dot{background:${C.green};}
.op-avail[data-tone="no"]{color:#D64545;}
.op-avail[data-tone="no"] .op-avail-dot{background:#D64545;}
.op-avail[data-tone="neutral"]{color:${C.muted};}
.op-avail[data-tone="neutral"] .op-avail-dot{background:${C.muted};}

/* SECTION 3 — sizes */
.op-sizes{display:flex;flex-wrap:wrap;gap:10px;}
.op-size{font-family:${UI};font-size:13px;min-width:48px;padding:11px 16px;border-radius:8px;
  background:${C.cream};border:1px solid #E8E8E8;color:${C.ink};cursor:pointer;
  transition:transform .12s ease,background .15s ease,border-color .15s ease;}
.op-size:active{transform:scale(0.96);}
.op-size--on{background:${C.fuchsia};border-color:${C.fuchsia};color:#fff;}
.op-size--off{color:${C.disabled};border:1px dashed #DADADA;text-decoration:line-through;
  cursor:not-allowed;background:${C.white};}
.op-sizeguide{margin-top:14px;background:none;border:none;padding:0;cursor:pointer;
  font-family:${UI};font-size:12px;color:${C.fuchsia};text-decoration:underline;}

/* SECTION 4 — calendar */
.op-cal{max-width:360px;margin:0 auto;}
.op-cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.op-cal-title{font-family:${SERIF};font-size:18px;color:${C.ink};}
.op-cal-nav{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
  background:transparent;border:1px solid ${C.divider};color:${C.fuchsia};cursor:pointer;transition:background .15s;}
.op-cal-nav:hover{background:${C.cream};}
.op-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.op-cal-dow{text-align:center;font-family:${UI};font-size:11px;color:${C.muted};padding-bottom:4px;}
.op-cal-day{aspect-ratio:1;display:grid;place-items:center;border:none;border-radius:50%;
  font-family:${UI};font-size:13px;color:${C.ink};background:transparent;cursor:pointer;transition:background .12s;}
.op-cal-day:hover:not(.op-cal-day--off):not(.op-cal-day--edge){background:#FCE7EF;}
.op-cal-day--edge{background:${C.fuchsia};color:#fff;font-weight:600;}
.op-cal-day--mid{background:#FCE7EF;color:${C.fuchsia};}
.op-cal-day--off{color:#D8D8D8;text-decoration:line-through;cursor:not-allowed;}
.op-range-summary{margin-top:16px;font-family:${UI};font-size:14px;color:${C.ink};}

/* SECTION 5 — accordion */
.op-acc-row{border-bottom:1px solid ${C.divider};}
.op-acc-row:first-child{border-top:1px solid ${C.divider};}
.op-acc-head{width:100%;display:flex;align-items:center;justify-content:space-between;
  background:none;border:none;padding:16px 0;cursor:pointer;font-family:${UI};font-size:13px;color:${C.ink};text-align:start;}
.op-acc-chev{color:${C.muted};transition:transform .3s ease;}
.op-acc-chev[data-open="true"]{transform:rotate(180deg);}
.op-acc-body{overflow:hidden;max-height:0;transition:max-height .35s ease;}
.op-acc-inner{padding:0 0 16px;font-family:${UI};font-size:13px;color:${C.subtle};line-height:1.8;}
.op-acc-inner p{margin:0 0 8px;}
.op-acc-inner strong{color:${C.ink};font-weight:600;}

/* SECTION 6 — reviews — rules unused now that the markup above is
   commented out (deferred feature); left in place, commented, for a clean
   re-enable rather than deleted.
.op-sec--reviews{background:#FAFAFA;}
.op-reviews{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;
  margin:0 -24px;padding:0 24px 4px;-webkit-overflow-scrolling:touch;}
.op-reviews::-webkit-scrollbar{display:none;}
.op-reviews{scrollbar-width:none;}
.op-review{flex:0 0 78%;max-width:300px;scroll-snap-align:start;background:#fff;
  border-radius:12px;padding:16px;}
.op-review-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.op-review-name{font-family:${UI};font-size:13px;font-weight:700;color:${C.ink};}
.op-stars{color:${C.fuchsia};font-size:13px;letter-spacing:1px;}
.op-review-text{font-family:${UI};font-size:13px;color:${C.subtle};line-height:1.7;margin:0 0 12px;}
.op-review-size{display:inline-block;font-family:${UI};font-size:11px;color:${C.subtle};
  background:${C.cream};border-radius:999px;padding:4px 10px;}
*/

/* SECTION 7 — similar */
.op-similar{display:flex;gap:14px;overflow-x:auto;margin:0 -24px;padding:0 24px 4px;-webkit-overflow-scrolling:touch;}
.op-similar::-webkit-scrollbar{display:none;}
.op-similar{scrollbar-width:none;}
.op-sim-card{flex:0 0 140px;width:140px;background:none;border:none;padding:0;cursor:pointer;text-align:start;}
.op-sim-img{width:140px;height:190px;object-fit:cover;border-radius:8px;display:block;}
.op-sim-name{display:block;font-family:${SERIF};font-size:14px;color:${C.ink};margin-top:8px;line-height:1.25;}
.op-sim-price{display:block;font-family:${UI};font-size:12px;color:${C.fuchsia};margin-top:2px;}

/* sticky CTA */
.op-cta-spacer{height:8px;}
.op-cta{position:absolute;bottom:0;left:0;right:0;background:#fff;border-top:1px solid ${C.divider};
  padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));}
.op-cta-price{font-family:${UI};font-size:16px;font-weight:600;color:${C.ink};white-space:nowrap;}
.op-cta-price span{font-size:12px;font-weight:400;color:${C.muted};}
@keyframes opGlow{0%,100%{box-shadow:0 4px 20px rgba(232,69,122,0.35);}50%{box-shadow:0 4px 28px rgba(232,69,122,0.6);}}
.op-cta-btn{font-family:${UI};font-size:15px;color:#fff;border:none;border-radius:30px;padding:14px 32px;
  cursor:pointer;background:linear-gradient(135deg,${C.fuchsia},${C.fuchsiaEnd});
  box-shadow:0 4px 20px rgba(232,69,122,0.35);animation:opGlow 2.4s ease-in-out 3;}
.op-cta-btn--off{background:${C.disabled};box-shadow:none;cursor:not-allowed;animation:none;}

/* size-guide modal */
.op-modal-overlay{position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;
  padding:24px;background:rgba(26,26,26,0.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}
.op-modal{position:relative;width:100%;max-width:380px;background:#fff;border-radius:16px;padding:28px 22px 22px;
  box-shadow:0 24px 64px rgba(0,0,0,0.25);}
.op-modal-x{position:absolute;top:14px;left:14px;width:34px;height:34px;border-radius:50%;border:none;
  background:${C.cream};color:${C.ink};display:grid;place-items:center;cursor:pointer;}
.op-modal-title{font-family:${SERIF};font-size:22px;font-weight:500;color:${C.ink};margin:0 0 16px;}
.op-size-table{width:100%;border-collapse:collapse;font-family:${UI};font-size:13px;}
.op-size-table th{color:${C.muted};font-weight:500;text-align:start;padding:8px 6px;border-bottom:1px solid ${C.divider};font-size:11px;text-transform:uppercase;letter-spacing:1px;}
.op-size-table td{padding:9px 6px;border-bottom:1px solid ${C.divider};color:${C.ink};}
.op-modal-note{font-family:${UI};font-size:12px;color:${C.subtle};line-height:1.7;margin:16px 0 0;}
`;
