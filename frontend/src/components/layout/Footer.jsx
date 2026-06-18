/* Site footer: brand blurb, nav shortcuts, contact details. The `.footer`
   styles live in styles.css; static spacing/typography use Tailwind utilities. */
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
          <h4>ניווט</h4>
          <p className="m-0 leading-[2]">
            <a onClick={() => go("home")}>בית</a><br />
            <a onClick={() => go("publish")}>פרסום שמלה</a><br />
            <a onClick={() => go("favorites")}>מועדפים</a>
          </p>
        </div>
        <div>
          <h4>יצירת קשר</h4>
          <p className="m-0 leading-[2]">
            מייל: hello@onenight.co.il<br />
            וואטסאפ: 03-0000000<br />
            <a onClick={() => toast("תקנון האתר")}>תקנון ותנאי שימוש</a>
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-[var(--border)] pt-6 text-center text-[10px] tracking-[0.08em] text-[var(--muted)]">
        © {year} onenight · כל הזכויות שמורות
      </div>
    </footer>
  );
}
