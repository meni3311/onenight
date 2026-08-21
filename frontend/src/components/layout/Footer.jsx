import { Icon } from "../ui/Icon.jsx";

const SOCIAL_LINKS = [
  { key: "whatsapp", label: "וואטסאפ", href: "https://wa.me/972586770772" },
  { key: "facebook", label: "פייסבוק", href: "#" },
  { key: "instagram", label: "אינסטגרם", href: "#" },
];

export function Footer({ go, toast }) {
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
            {}
            <a className="cursor-pointer" onClick={() => go && go("contact")}>צור קשר</a><br />
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
