import { useReveal } from "../../hooks/useReveal.js";
import { COLORS, ALPHA, FONTS } from "../../constants/theme.js";

/* "קצת עלינו" — short brand intro that fades up on scroll with a stagger.
   The opacity/transform values depend on `shown`, so they stay inline. */
export function AboutSection() {
  const [ref, shown] = useReveal(0.2);
  const rise = (delay) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(30px)",
    transition: `opacity 0.7s ease-out ${delay}s, transform 0.7s ease-out ${delay}s`,
  });
  return (
    <section dir="rtl" ref={ref} className="w-full px-6 py-20" style={{ background: COLORS.cream }}>
      <div className="mx-auto text-center" style={{ maxWidth: "480px" }}>
        <p
          style={{
            ...rise(0),
            fontFamily: FONTS.assistant,
            fontSize: "22px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            color: COLORS.eyebrow,
          }}
        >
          קצת עלינו
        </p>
        <p
          style={{
            ...rise(0.3),
            marginTop: "18px",
            marginInline: "auto",
            maxWidth: "480px",
            fontFamily: FONTS.assistant,
            fontSize: "0.95rem",
            lineHeight: 1.8,
            color: ALPHA.darkText,
          }}
        >
          onenight היא מרכז ההשכרה של שמלות הערב בישראל. אנחנו מאמינות שכל אישה מגיעה להרגיש מושלמת, בלי לקנות, בלי לבזבז, רק ללבוש ולזרוח.
        </p>
      </div>
      {/* divider below section */}
      <div style={{ width: "40px", height: "1px", background: COLORS.rose, margin: "48px auto 0" }} />
    </section>
  );
}
