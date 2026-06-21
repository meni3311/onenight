import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { useScrolled } from "../../hooks/useScrolled.js";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { useAuth } from "../../context/AuthContext.jsx";

/* Bordeaux tone shared by the navbar's User + Menu icons and the wordmark. */
const BORDEAUX = "#6B2D2D";

/* Sticky 3-column navbar (User · logo · hamburger) with an RTL slide-in
   side menu. lucide-react is unavailable in this environment, so the
   project's inline Icon set / inline SVGs supply the matching glyphs. */
export function SiteHeader({ go }) {
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  const { requestPublish } = useAuth();

  useBodyScrollLock(open);

  const close = () => setOpen(false);

  /* Run a navigation action, then close the menu. */
  const navigate = (action) => {
    action();
    close();
  };

  /* "פרסמי שמלה" gate lives in AuthContext (logged-in → /publish, else modal). */
  const handlePublish = () => {
    setOpen(false);
    requestPublish();
  };

  const links = [
    { label: "דף הבית", action: () => { go("home"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "גלריה", action: () => { go("home"); setTimeout(() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" }), 60); } },
    { label: "איך זה עובד", action: () => { go("home"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "צור קשר", action: () => { go("home"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
  ];

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ease-lux"
        style={{
          background: scrolled ? "rgba(110,44,44,0.16)" : "rgba(110,44,44,0.08)",
          backdropFilter: "blur(14px) saturate(1.4)",
          WebkitBackdropFilter: "blur(14px) saturate(1.4)",
          borderBottom: scrolled
            ? "1px solid rgba(139,58,58,0.22)"
            : "1px solid rgba(139,58,58,0.12)",
        }}
      >
        {/* dir=ltr pins the User icon visually LEFT and the hamburger RIGHT,
            while the centered logo stays dead-center. */}
        <div
          dir="ltr"
          className="relative mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 lg:px-10"
        >
          {/* LEFT — user account placeholder */}
          <button
            type="button"
            aria-label="חשבון משתמש"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-light"
            style={{ color: BORDEAUX }}
          >
            <Icon.user width="20" height="20" className="block" />
          </button>

          {/* CENTER — wordmark + tagline, absolutely centered */}
          <button
            type="button"
            onClick={() => navigate(() => { go("home"); window.scrollTo({ top: 0, behavior: "smooth" }); })}
            title="onenight — דף הבית"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none focus:outline-none"
          >
            <span
              dir="ltr"
              className="font-display text-[26px] font-medium italic lowercase tracking-tight"
              style={{ color: BORDEAUX }}
            >
              onenight
            </span>
            <span className="mt-0.5 font-body text-[11px] font-medium tracking-[0.22em] text-muted">
              השכרת שמלות ערב
            </span>
          </button>

          {/* RIGHT — hamburger opens the side menu */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="פתיחת תפריט"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-light"
            style={{ color: BORDEAUX }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="block">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Side menu — slides in from the RIGHT (RTL) */}
      <aside
        dir="rtl"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "75vw",
          height: "100vh",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "rgba(42, 31, 31, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(196, 160, 160, 0.15)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: open ? "transform 0.35s ease-out" : "transform 0.3s ease-in",
        }}
      >
        {/* Header: close button (top-right) + centered logo + divider */}
        <div className="relative pt-6">
          <button
            type="button"
            onClick={close}
            aria-label="סגירת תפריט"
            className="absolute bg-transparent"
            style={{ top: "20px", right: "20px", padding: "4px", color: "rgba(255,255,255,0.8)" }}
          >
            <Icon.close width="24" height="24" className="block" />
          </button>

          <div className="flex flex-col items-center pt-2">
            <span
              dir="ltr"
              className="font-display italic lowercase"
              style={{ fontSize: "1.5rem", color: "#C4A0A0" }}
            >
              onenight
            </span>
            <span
              className="mt-3"
              style={{ width: "40px", height: "1px", background: "rgba(196,160,160,0.2)" }}
            />
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col items-center" style={{ paddingTop: "48px", gap: "32px" }}>
          {links.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => navigate(it.action)}
              className="bg-transparent font-body uppercase text-white/80 transition-colors duration-200 hover:text-white"
              style={{ fontSize: "1rem", letterSpacing: "0.08em" }}
            >
              {it.label}
            </button>
          ))}
        </nav>

        {/* Footer CTA pinned to the bottom */}
        <div className="mt-auto flex justify-center pb-10">
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-full bg-transparent transition-colors duration-200"
            style={{
              width: "200px",
              padding: "12px 32px",
              border: "1px solid #C4A0A0",
              color: "#C4A0A0",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(196,160,160,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            פרסמי שמלה
          </button>
        </div>
      </aside>
    </>
  );
}
