import { COLORS } from "../constants/theme.js";

/* Confirmation screen shown after a dress is submitted for review.
   Boutique-luxury redesign: cream canvas, bordeaux/rose accents, Lora
   italic heading + Assistant body (matching the rest of the site's
   editorial pairing), sharp (non-rounded) corners, and a line-art
   checkmark instead of a generic icon. */
export default function ThankYou({ goHome }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px",
        background: COLORS.cream,
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
          fontSize: "clamp(30px, 5vw, 44px)",
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
          color: "#5C544C",
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
  );
}
