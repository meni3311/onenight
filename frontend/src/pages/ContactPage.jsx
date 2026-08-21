import { useState } from "react";
import { COLORS } from "../constants/theme.js";
import { submitContactInquiry } from "../lib/api.js";

const CONTACT = {
  email: "menicamp@gmail.com",
  phone: "058-6770772",
  whatsapp: "972586770772",
};

const CONTACT_METHODS = [
  {
    key: "email",
    label: "אימייל",
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
    note: "מענה תוך יום עסקים",
  },
  {
    key: "phone",
    label: "טלפון",
    value: CONTACT.phone,
    href: `tel:${CONTACT.phone.replace(/-/g, "")}`,
    note: "ימים א׳–ה׳, 09:00–18:00",
  },
  {
    key: "whatsapp",
    label: "וואטסאפ",
    value: CONTACT.phone,
    href: `https://wa.me/${CONTACT.whatsapp}`,
    note: "הדרך המהירה ביותר",
    external: true,
  },
];

const FAQ = [
  {
    q: "איך ההשכרה עובדת?",
    a: "בוחרים שמלה בגלריה, בוחרים מידה ותאריכים, ולוחצים \"להזמנה\". הבקשה נפתחת כשיחת וואטסאפ ישירות מול בעלת השמלה — היא מאשרת, ואתן מתאמות ביניכן איסוף והחזרה. onenight מחברת ביניכן ואינה צד בעסקה.",
  },
  {
    q: "כמה עולה להשכיר שמלה?",
    a: "המחיר נקבע על ידי בעלת השמלה ומופיע על כל מודעה כמחיר לערב. אין עמלה מצד האתר ואין תשלום דרכו — התשלום מתבצע ישירות בין השוכרת למשכירה.",
  },
  {
    q: "אפשר למדוד את השמלה לפני?",
    a: "כן. רוב בעלות השמלות שמחות לתאם מדידה, ומומלץ לבקש זאת בשיחת הוואטסאפ עוד לפני סגירת התאריכים. מדריך המידות בעמוד השמלה עוזר לצמצם את ההתלבטות מראש.",
  },
  {
    q: "מי אחראית על הניקוי?",
    a: "השמלה נמסרת נקייה ומוחזרת נקייה. עלות הניקוי היא על השוכרת, אלא אם סוכם אחרת מול בעלת השמלה. כתמים חריגים או נזק מחייבים ניקוי יבש ותיאום ישיר ביניכן.",
  },
  {
    q: "מה קורה אם השמלה ניזוקה?",
    a: "זה עניין שבין השוכרת לבעלת השמלה, ומומלץ לסכם עליו מראש — כולל פיקדון, אם בעלת השמלה מבקשת כזה. פירוט מלא נמצא בתנאי השימוש של האתר.",
  },
  {
    q: "איך מפרסמים שמלה להשכרה?",
    a: "נרשמים, לוחצים \"פרסמי שמלה\", וממלאים את פרטי השמלה והתמונות. כל מודעה עוברת אישור שלנו לפני שהיא עולה לגלריה — בדרך כלל תוך 24–48 שעות, ומקבלים על כך מייל.",
  },
];

const MESSAGE_MAX = 2000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function FaqRow({ item, open, onToggle }) {
  return (
    <div className="border-b" style={{ borderColor: "rgba(107,45,45,0.14)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 bg-transparent py-5 text-start"
      >
        <span className="font-display text-[17px] leading-snug" style={{ color: COLORS.dark }}>
          {item.q}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.bordeaux}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transition: "transform .3s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows .3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <p className="pb-5 text-sm leading-7" style={{ color: "rgba(42,31,31,0.72)" }}>
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage({ goHome }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (k, val) => {
    setForm((p) => ({ ...p, [k]: val }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "נא להזין שם";
    if (!form.email.trim()) e.email = "נא להזין כתובת אימייל";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "כתובת האימייל אינה תקינה";
    if (!form.message.trim()) e.message = "נא לכתוב הודעה";
    else if (form.message.trim().length > MESSAGE_MAX) e.message = `עד ${MESSAGE_MAX} תווים`;
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSending(true);
    try {
      await submitContactInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setSubmitError(err?.message || "שליחת ההודעה נכשלה. נסי שוב בעוד רגע.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: "100%",
    borderRadius: 0,
    border: "1px solid rgba(107,45,45,0.2)",
    background: COLORS.cream,
    padding: "11px 13px",
    fontFamily: "'Assistant', system-ui, sans-serif",
    fontSize: "14px",
    color: COLORS.dark,
    outline: "none",
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[760px] px-6 pb-28 pt-12 lg:px-10">
      <button
        type="button"
        onClick={goHome}
        className="mb-10 bg-transparent font-body text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
      >
        → חזרה לדף הבית
      </button>

      <header className="mb-12 text-center">
        <p
          className="font-body text-[11px] uppercase tracking-[0.24em]"
          style={{ color: COLORS.rose }}
        >
          onenight
        </p>
        <h1 className="mt-3 font-display text-3xl lg:text-4xl" style={{ color: COLORS.dark }}>
          צור קשר
        </h1>
        <p className="mx-auto mt-4 max-w-[440px] font-body text-sm leading-7 text-muted">
          שאלה על שמלה, על פרסום מודעה, או משהו שלא הסתדר — כתבי לנו ונחזור אלייך.
        </p>
      </header>

      {}
      <section className="mb-16">
        <h2
          className="mb-5 font-body text-[11px] uppercase tracking-[0.2em]"
          style={{ color: COLORS.bordeaux }}
        >
          פרטי התקשרות
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {CONTACT_METHODS.map((m) => (
            <a
              key={m.key}
              href={m.href}
              {...(m.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="block p-5 transition-colors"
              style={{
                borderRadius: 0,
                border: "1px solid rgba(107,45,45,0.16)",
                background: COLORS.cream,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.rose; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(107,45,45,0.16)"; }}
            >
              <span
                className="block font-body text-[10px] uppercase tracking-[0.18em]"
                style={{ color: COLORS.rose }}
              >
                {m.label}
              </span>
              {}
              <span
                dir="ltr"
                className="mt-2 block break-words text-start font-body text-[15px]"
                style={{ color: COLORS.bordeaux }}
              >
                {m.value}
              </span>
              <span className="mt-1 block font-body text-[11px] text-muted">{m.note}</span>
            </a>
          ))}
        </div>
      </section>

      {}
      <section className="mb-16">
        <h2
          className="mb-2 font-body text-[11px] uppercase tracking-[0.2em]"
          style={{ color: COLORS.bordeaux }}
        >
          שאלות נפוצות
        </h2>
        <div style={{ borderTop: "1px solid rgba(107,45,45,0.14)" }}>
          {FAQ.map((item, i) => (
            <FaqRow
              key={item.q}
              item={item}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      {}
      <section>
        <h2
          className="mb-5 font-body text-[11px] uppercase tracking-[0.2em]"
          style={{ color: COLORS.bordeaux }}
        >
          שליחת הודעה
        </h2>

        {sent ? (
          <div
            className="p-8 text-center"
            style={{
              borderRadius: 0,
              border: "1px solid rgba(107,45,45,0.16)",
              background: COLORS.cream,
            }}
          >
            <h3 className="font-display text-2xl" style={{ color: COLORS.dark }}>
              ההודעה נשלחה
            </h3>
            <p className="mt-3 font-body text-sm leading-7 text-muted">
              תודה שכתבת לנו. נחזור אלייך למייל שהשארת, בדרך כלל תוך יום עסקים.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 bg-transparent font-body text-xs uppercase tracking-[0.14em] transition-colors"
              style={{ color: COLORS.bordeaux }}
            >
              שליחת הודעה נוספת
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[11px] uppercase tracking-[0.14em] text-muted">שם</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="השם שלך"
                  style={inputStyle}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <span className="err">{errors.name}</span>}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[11px] uppercase tracking-[0.14em] text-muted">אימייל</span>
                <input
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  style={{ ...inputStyle, textAlign: "start" }}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <span className="err">{errors.email}</span>}
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[11px] uppercase tracking-[0.14em] text-muted">הודעה</span>
              <textarea
                rows={6}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="במה נוכל לעזור?"
                maxLength={MESSAGE_MAX}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                aria-invalid={!!errors.message}
              />
              {errors.message && <span className="err">{errors.message}</span>}
            </label>

            {submitError && <p className="err">{submitError}</p>}

            <div>
              <button
                type="submit"
                disabled={sending}
                className="font-body text-[12px] uppercase tracking-[0.16em] transition-colors"
                style={{
                  borderRadius: 0,
                  border: "none",
                  padding: "13px 40px",
                  color: "#fff",
                  background: sending ? COLORS.rose : COLORS.bordeaux,
                  cursor: sending ? "default" : "pointer",
                }}
                onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = "#5A2424"; }}
                onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = COLORS.bordeaux; }}
              >
                {sending ? "שולחת…" : "שליחה"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
