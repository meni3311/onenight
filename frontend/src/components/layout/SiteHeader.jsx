import { useState } from "react";
import { Logo } from "./Logo.jsx";
import { Icon } from "../ui/Icon.jsx";
import { useScrolled } from "../../hooks/useScrolled.js";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";

/* Sticky navigation: blur-on-scroll, RTL, with a full-screen mobile menu. */
export function SiteHeader({ route, go, user, favCount = 0, onLogin, onLogout }) {
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);

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
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#6B2D2D] transition-colors hover:bg-brand-light md:hidden"
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
