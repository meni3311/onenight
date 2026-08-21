import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getMyDresses } from "../../lib/api.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";
import { Icon } from "./Icon.jsx";

const SHOW_DELAY_MS = 2500;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function PublishPromoPopup() {
  const { isLoggedIn, account, requestPublish } = useAuth();
  const [dismissedAt, setDismissedAt] = useLocalStorage("onenight_publish_promo_dismissed_at", 0);
  const [visible, setVisible] = useState(false);

  const [hasListing, setHasListing] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !account?.email) { setHasListing(false); return; }
    let cancelled = false;
    getMyDresses(account.email)
      .then((rows) => { if (!cancelled) setHasListing((rows || []).length > 0); })
      .catch(() => { if (!cancelled) setHasListing(true); });
    return () => { cancelled = true; };
  }, [isLoggedIn, account?.email]);

  const hasActiveListing = hasListing !== false;

  const withinCooldown = Date.now() - dismissedAt < COOLDOWN_MS;
  const eligible = !hasActiveListing && !withinCooldown;

  useEffect(() => {
    if (!eligible) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  const dismiss = () => {
    setVisible(false);
    setDismissedAt(Date.now());
  };

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePublishClick = () => {
    dismiss();
    requestPublish();
  };

  if (!eligible) return null;

  return (
    <div
      onClick={dismiss}
      aria-hidden={!visible}
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
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="לשמלה שלך מגיע עוד לילה אחד"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "320px",
          padding: "36px 28px",
          textAlign: "center",
          color: "#fff",
          background: "rgba(42, 31, 31, 0.85)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(196, 160, 160, 0.2)",
          borderRadius: "20px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.95)",
          transition: visible
            ? "opacity 0.25s ease-out, transform 0.25s ease-out"
            : "opacity 0.2s ease-in, transform 0.2s ease-in",
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגירה"
          className="absolute bg-transparent"
          style={{ top: "16px", left: "16px", padding: "2px", color: "rgba(255,255,255,0.5)", zIndex: 1 }}
        >
          <Icon.close width="18" height="18" className="block" />
        </button>

        {}
        <div style={{ fontSize: "2rem" }}>🌸</div>

        <h3 className="font-body" style={{ marginTop: "6px", fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
          לשמלה שלך מגיע עוד לילה אחד ✨
        </h3>

        <p
          className="font-body"
          style={{ marginTop: "10px", fontSize: "0.85rem", lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}
        >
          שמלת ערב ששוכבת בארון יכולה להביא לך הכנסה נאה - ולתת מישהי אחרת רגע קסום ✨. הצטרפי לקהילת onenight 🌸, פרסמי שמלה בכמה דקות, והתחילי להרוויח.
        </p>

        <div className="flex flex-col" style={{ gap: "12px", marginTop: "24px" }}>
          <button
            type="button"
            onClick={handlePublishClick}
            className="w-full rounded-full py-3 font-body transition-colors duration-200"
            style={{ background: "#6B2D2D", color: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#5A2424"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#6B2D2D"; }}
          >
            👗 פרסמי שמלה
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="bg-transparent font-body"
            style={{ fontSize: "0.8rem", textDecoration: "underline", color: "#C4A0A0" }}
          >
            אולי מאוחר יותר
          </button>
        </div>
      </div>
    </div>
  );
}
