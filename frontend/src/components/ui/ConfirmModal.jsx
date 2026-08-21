import { Icon } from "./Icon.jsx";

export function ConfirmModal({
  open,
  title,
  message,
  children,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <div
      onClick={onCancel}
      aria-hidden={!open}
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
        opacity: open ? 1 : 0,
        transition: "opacity 0.25s",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "340px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          padding: "36px 28px",
          textAlign: "center",
          color: "#fff",
          background: "rgba(42, 31, 31, 0.85)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(196, 160, 160, 0.2)",
          borderRadius: "20px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.95)",
          transition: open
            ? "opacity 0.25s ease-out, transform 0.25s ease-out"
            : "opacity 0.2s ease-in, transform 0.2s ease-in",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="סגירה"
          className="absolute bg-transparent"
          style={{ top: "16px", left: "16px", padding: "2px", color: "rgba(255,255,255,0.5)", zIndex: 1 }}
        >
          <Icon.close width="18" height="18" className="block" />
        </button>

        {title && (
          <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
            {title}
          </h3>
        )}
        {message && (
          <p
            className="font-body"
            style={{ marginTop: "10px", fontSize: "0.85rem", lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}
          >
            {message}
          </p>
        )}

        {}
        {children && <div style={{ marginTop: "16px", textAlign: "start" }}>{children}</div>}

        <div className="flex flex-col" style={{ gap: "12px", marginTop: "24px" }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="w-full rounded-full py-3 font-body transition-colors duration-200"
            style={{ background: "#6B2D2D", color: "#fff", opacity: busy ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "#5A2424"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#6B2D2D"; }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full bg-transparent py-3 font-body transition-colors duration-200"
            style={{ border: "1px solid #C4A0A0", color: "#C4A0A0" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(196,160,160,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
