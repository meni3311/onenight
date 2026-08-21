import { useReveal } from "../../hooks/useReveal.js";
import { COLORS, ALPHA, FONTS } from "../../constants/theme.js";

const HowIcon = {
  dress: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  ),
  calendar: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" />
    </svg>
  ),
  message: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
};

const STEPS = [
  { n: "1", icon: HowIcon.dress, title: "בחרי שמלה", desc: "עיינו בגלריה ובחרו את השמלה שדיברה אליכן" },
  { n: "2", icon: HowIcon.calendar, title: "בדקי זמינות", desc: "בדקו שהשמלה פנויה לתאריך האירוע שלכן" },
  { n: "3", icon: HowIcon.message, title: "תאמי איסוף", desc: "יצרו קשר ישיר עם בעלת השמלה לתיאום המדידה ואיסוף" },
];

export function HowItWorks() {
  const [ref, shown] = useReveal(0.2);
  return (
    <section dir="rtl" className="w-full px-6 py-16">
      <p
        className="text-center"
        style={{
          fontFamily: FONTS.assistant,
          fontSize: "22px",
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: COLORS.eyebrow,
        }}
      >
        איך זה עובד
      </p>
      <div
        ref={ref}
        className="mx-auto"
        style={{
          marginTop: "20px",
          maxWidth: "480px",
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(196,160,160,0.25)",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 8px 32px rgba(107,45,45,0.06)",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          return (
            <div key={s.n}>
              {i > 0 && <div style={{ height: "1px", background: ALPHA.roseDivider, margin: "0 16px" }} />}
              <div className="flex items-center" style={{ gap: "16px", padding: "16px 0" }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: "44px",
                    height: "44px",
                    background: "rgba(196,160,160,0.15)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.bordeaux,
                  }}
                >
                  <StepIcon />
                </div>
                <div className="text-right" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONTS.assistant, fontSize: "10px", letterSpacing: "1.5px", color: COLORS.rose }}>{s.n}</div>
                  <div style={{ fontFamily: FONTS.assistant, fontWeight: 600, color: COLORS.dark, marginTop: "2px" }}>{s.title}</div>
                  <div style={{ fontFamily: FONTS.assistant, fontSize: "0.85rem", lineHeight: 1.6, color: ALPHA.darkTextSoft, marginTop: "4px" }}>{s.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
