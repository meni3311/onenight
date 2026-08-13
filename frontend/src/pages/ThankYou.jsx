import { COLORS } from "../constants/theme.js";
import { Confetti } from "../components/ui/Confetti.jsx";

/* Confirmation screen shown after a dress is submitted for review.
   Boutique-luxury redesign: cream canvas, bordeaux/rose accents, Lora
   italic heading + Assistant body (matching the rest of the site's
   editorial pairing), sharp (non-rounded) corners, and a line-art
   checkmark instead of a generic icon.

   Confetti + the frosted message card are the celebratory layer on top of
   that: the card reuses the same translucent/blurred/rose-bordered glass
   language as ConfirmModal and the auth modal's "welcome" popup, just in
   this page's own light cream palette instead of their dark one — festive
   rather than a dialog box dropped onto the page. Corners stay sharp
   (0, not the modal family's 20px) to match the rest of the site's
   buttons/cards/chips, not the one place that uses heavy rounding. */
export default function ThankYou({ goHome }) {
  return (
    <div
      dir="rtl"
      style={{
        position: "relative",
        minHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px",
        background: COLORS.cream,
        overflow: "hidden",
      }}
    >
      <Confetti />

      {/* Soft bordeaux/rose glow behind the card — blurred and low-opacity,
          for warmth rather than a loud graphic. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "560px",
          height: "560px",
          maxWidth: "90vw",
          maxHeight: "90vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.rose}55 0%, ${COLORS.bordeaux}22 45%, transparent 72%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(196,160,160,0.35)",
          backdropFilter: "blur(18px) saturate(1.25)",
          WebkitBackdropFilter: "blur(18px) saturate(1.25)",
          boxShadow: "0 16px 48px rgba(107,45,45,0.08)",
          padding: "52px 40px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Sharp-cornered frame around a hand-drawn-feeling check stroke —
            same line-weight convention as the rest of the site's icon set. */}
        <div
          aria-hidden="true"
          style={{
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${COLORS.bordeaux}`,
            marginBottom: "28px",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={COLORS.bordeaux} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4.5 4.5L19 7" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Lora', 'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(32px, 6vw, 52px)",
            color: COLORS.bordeaux,
            margin: "0 0 16px",
            lineHeight: 1.25,
            maxWidth: "560px",
          }}
        >
          ברכותינו!
        </h1>

        <p
          style={{
            fontFamily: "'Assistant', sans-serif",
            fontSize: "15px",
            fontWeight: 300,
            lineHeight: 1.9,
            color: COLORS.dark,
            maxWidth: "440px",
            margin: "0 0 32px",
          }}
        >
          הבקשה תיבחן ותתקבל הודעה כשתאושר.
        </p>

        <button type="button" className="btn btn-rose" onClick={goHome}>
          חזרה לעמוד הבית
        </button>
      </div>
    </div>
  );
}
