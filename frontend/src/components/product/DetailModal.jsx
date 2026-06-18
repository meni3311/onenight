import { useState, useEffect } from "react";
import { Img } from "../ui/Img.jsx";
import { Icon } from "../ui/Icon.jsx";
import { AvailabilityCalendar } from "../calendar/AvailabilityCalendar.jsx";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";

/* Full dress detail: split image gallery / info panel with an internal
   scroll, availability picker and a WhatsApp rental request. */
export function DetailModal({ d, fav, onFav, onClose, toast }) {
  const [idx, setIdx] = useState(0);
  const [range, setRange] = useState({ start: null, end: null });

  useBodyScrollLock(true);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
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
