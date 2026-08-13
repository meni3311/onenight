import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { useScrolled } from "../../hooks/useScrolled.js";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { useAuth } from "../../context/AuthContext.jsx";

/* Bordeaux tone shared by the navbar's User + Menu icons and the wordmark. */
const BORDEAUX = "#6B2D2D";

/* Glassmorphism dropdown anchored under the User icon — same frosted-dark
   family as the auth modal, with a slightly denser fill and a softer,
   subtly-rounded corner treatment of its own. */
const MENU_ITEM_STYLE = {
  display: "block",
  width: "100%",
  padding: "11px 18px",
  background: "transparent",
  border: "none",
  fontFamily: "'Assistant', system-ui, sans-serif",
  fontSize: "0.88rem",
  textAlign: "right",
  color: "rgba(255,255,255,0.85)",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
};

/* Signed-in dropdown: name header, nav links, then a visually distinct
   logout row. Closes on outside click / Escape (wired by the parent). */
function UserMenu({ name, onFavorites, onListings, onProfile, onLogout }) {
  const hover = (e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; };
  const unhover = (e) => { e.currentTarget.style.background = "transparent"; };

  return (
    <div
      dir="rtl"
      role="menu"
      aria-label="תפריט משתמש"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        /* Anchored to the icon's own left edge, not its right — the icon
           sits near the LEFT edge of the screen (dir=ltr header layout),
           so a right-anchored menu had nowhere to expand and clipped off
           the viewport on narrow screens. Expanding rightward from the
           icon (toward the center) keeps it fully on-screen at every
           breakpoint without needing per-breakpoint overrides. */
        left: 0,
        zIndex: 60,
        minWidth: "220px",
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        background: "rgba(42, 31, 31, 0.94)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(196, 160, 160, 0.2)",
        borderRadius: "12px",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3)",
        padding: "6px 0",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          fontFamily: "'Assistant', system-ui, sans-serif",
          fontSize: "0.92rem",
          fontWeight: 600,
          color: "#fff",
          textAlign: "right",
        }}
      >
        {name}
      </div>

      <div style={{ height: "1px", background: "rgba(196,160,160,0.18)" }} />

      <button type="button" role="menuitem" onClick={onFavorites} style={MENU_ITEM_STYLE} onMouseEnter={hover} onMouseLeave={unhover}>
        המועדפים שלי
      </button>
      <button type="button" role="menuitem" onClick={onListings} style={MENU_ITEM_STYLE} onMouseEnter={hover} onMouseLeave={unhover}>
        השמלות שלי
      </button>
      <button type="button" role="menuitem" onClick={onProfile} style={MENU_ITEM_STYLE} onMouseEnter={hover} onMouseLeave={unhover}>
        פרטים אישיים
      </button>

      <div style={{ height: "1px", background: "rgba(196,160,160,0.18)" }} />

      <button
        type="button"
        role="menuitem"
        onClick={onLogout}
        style={{ ...MENU_ITEM_STYLE, color: "#E3A9A9" }}
        onMouseEnter={hover}
        onMouseLeave={unhover}
      >
        התנתקות
      </button>
    </div>
  );
}

/* Sticky 3-column navbar (User · logo · hamburger) with an RTL slide-in
   side menu. lucide-react is unavailable in this environment, so the
   project's inline Icon set / inline SVGs supply the matching glyphs. */
export function SiteHeader({ go, goAccount }) {
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { isLoggedIn, account, openAuth, logout, requestPublish } = useAuth();

  useBodyScrollLock(open);

  const close = () => setOpen(false);
  const closeUserMenu = () => setUserMenuOpen(false);

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

  /* User icon: signed out → open the shared auth modal; signed in → toggle
     the dropdown. Closes on outside click / Escape while open. */
  const handleUserClick = () => {
    if (!isLoggedIn) {
      openAuth();
    } else {
      setUserMenuOpen((v) => !v);
    }
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) closeUserMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeUserMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  const runFromMenu = (action) => {
    closeUserMenu();
    action();
  };

  const handleLogout = () => {
    closeUserMenu();
    logout();
    go("home");
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
          {/* LEFT — user account: signed out opens the auth modal, signed
              in opens this anchored dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-label="חשבון משתמש"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={handleUserClick}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-light"
              style={{ color: BORDEAUX }}
            >
              <Icon.user width="20" height="20" className="block" />
            </button>

            {isLoggedIn && userMenuOpen && (
              <UserMenu
                name={account?.name || account?.email || "החשבון שלי"}
                onFavorites={() => runFromMenu(() => go("favorites"))}
                onListings={() => runFromMenu(() => goAccount("ads"))}
                onProfile={() => runFromMenu(() => goAccount("account"))}
                onLogout={handleLogout}
              />
            )}
          </div>

          {/* CENTER — wordmark + tagline, absolutely centered */}
          <button
            type="button"
            onClick={() => navigate(() => { go("home"); window.scrollTo({ top: 0, behavior: "smooth" }); })}
            title="onenight — דף הבית"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none focus:outline-none"
          >
            <span
              dir="ltr"
              className="font-display text-[26px] font-medium italic tracking-tight"
              style={{ color: BORDEAUX }}
            >
              oneNight
            </span>
            <span className="mt-0.5 font-body text-[11px] font-medium tracking-[0.22em] text-muted" style={{ color: BORDEAUX }}>
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
