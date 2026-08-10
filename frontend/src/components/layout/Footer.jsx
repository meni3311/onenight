import { Icon } from "../ui/Icon.jsx";

/* Social links, in the requested display order (WhatsApp, Facebook,
   Instagram) — DOM order = visual order here since the row is a plain flex
   row under the site's existing direction:rtl, same as before. Instagram/
   Facebook are placeholders until the real accounts are provided; WhatsApp
   reuses the number shown above in "יצירת קשר" (058-6770772 →
   wa.me/972586770772). */
const SOCIAL_LINKS = [
  { key: "whatsapp", label: "וואטסאפ", href: "https://wa.me/972586770772" },
  { key: "facebook", label: "פייסבוק", href: "#" },
  { key: "instagram", label: "אינסטגרם", href: "#" },
];

/* Site footer: brand blurb + contact details, stacked and centered (the
   "ניווט" column was dropped — those links already exist elsewhere in the
   site, e.g. the navbar/user menu). The `.footer` styles live in
   styles.css; static spacing/typography use Tailwind utilities. */
export function Footer({ toast }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <h4>onenight</h4>
          <p className="m-0">
            השכרת שמלות ערב · קהילה של נשים<br />
            שמלה אחת, ערב אחד, זיכרון לכל החיים.
          </p>
        </div>
        <div>
          <h4>יצירת קשר</h4>
          <p className="m-0 leading-[2]">
            מייל: menicamp@gmail.com<br />
            וואטסאפ: 058-6770772<br />
            <a onClick={() => toast("תקנון האתר")}>תקנון ותנאי שימוש</a>
          </p>
        </div>
      </div>

      <div className="footer-social">
        {SOCIAL_LINKS.map(({ key, label, href }) => {
          const IconGlyph = Icon[key];
          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="footer-social-link"
            >
              <IconGlyph width="26" height="26" />
            </a>
          );
        })}
      </div>

      <div className="mt-8 border-t border-[var(--border)] pt-6 text-center text-[10px] tracking-[0.08em] text-[var(--muted)]">
        © {year} onenight · כל הזכויות שמורות
      </div>
    </footer>
  );
}
