import { useState, useEffect } from "react";
import { REGIONS, SIZES, CONDITIONS, DRESS_LENGTHS, SLEEVE_LENGTHS } from "../lib/data.js";
import { DEFAULT_DRESS_COLOR_HEX } from "../constants/theme.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ImageUploader } from "../components/ui/ImageUploader.jsx";

const EMPTY_FORM = {
  title: "", desc: "", color: "", condition: "", price: "",
  region: "", city: "", size: "", source: "", store: "", phone: "", email: "",
  dressLength: "", sleeveLength: "",
};
const MAX_IMAGES = 3;

/* Strip everything but digits so "050-1234567" and "050 1234567" validate
   the same as "0501234567". */
const normalizePhone = (s) => (s || "").replace(/\D/g, "");

/* Publish-a-dress form with client-side validation and image previews. */
export default function PublishPage({ onSubmit, goHome }) {
  const { isLoggedIn, account } = useAuth();
  const [v, setV] = useState(() => ({ ...EMPTY_FORM, email: account?.email || "" }));
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  /* Required acknowledgment of the two notice boxes below, replacing the
     old pre-submit confirm popup — same required-checkbox pattern already
     used for Terms of Use acceptance in AuthContext.jsx's registration
     flow, rather than a plain "read-only, no action needed" notice. */
  const [agreeLiability, setAgreeLiability] = useState(false);
  const [agreeFee, setAgreeFee] = useState(false);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  /* Ownership is keyed by the account's email (see AccountPage's "my
     listings" filter) — while signed in, lock the field to that address
     instead of a free-typed one so the listing reliably shows up under
     "השמלות שהעליתי" afterwards. Re-syncs if the user logs in mid-visit
     (the auth modal is reachable from the navbar on every page). */
  useEffect(() => {
    if (isLoggedIn && account?.email) set("email", account.email);
  }, [isLoggedIn, account?.email]);

  const validate = () => {
    const e = {};
    if (!v.title.trim()) e.title = "נא להזין כותרת";
    if (!v.desc.trim()) e.desc = "נא להזין תיאור";
    if (!v.condition) e.condition = "נא לבחור מצב";
    if (!v.dressLength) e.dressLength = "נא לבחור אורך שמלה";
    if (!v.sleeveLength) e.sleeveLength = "נא לבחור אורך שרוול";
    if (!v.price || +v.price <= 0) e.price = "נא להזין מחיר";
    if (!v.region) e.region = "נא לבחור אזור";
    if (!v.size) e.size = "נא לבחור מידה";
    if (!v.source) e.source = "נא לבחור מקור";
    if (v.source === "שם חנות" && !v.store.trim()) e.store = "נא להזין שם חנות";
    if (!/^0\d{8,9}$/.test(normalizePhone(v.phone))) e.phone = "מספר טלפון לא תקין (לדוגמה 050-1234567)";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "כתובת מייל לא תקינה";
    if (images.length === 0) e.images = "נא להעלות לפחות תמונה אחת";
    if (!agreeLiability) e.liability = "יש לאשר את סעיף האחריות כדי להמשיך";
    if (!agreeFee) e.fee = "יש לאשר את סעיף העמלה כדי להמשיך";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  /* No more confirm-popup gate — the two notice boxes below (liability +
     fee) are read directly on the page and required via their own
     checkboxes, so a valid submit here goes straight through. */
  const submit = () => {
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    /* Phone is contact info only — never used to match ownership. */
    onSubmit({ ...v, phone: normalizePhone(v.phone), price: +v.price, images, colorHex: DEFAULT_DRESS_COLOR_HEX });
  };

  return (
    <div className="container page pt-10">
      <div className="form-card">
        <h2>פרסום שמלה</h2>
        <p className="form-sub">ללא צורך בהרשמה · נבדוק את המודעה ונחזור אלייך תוך 24–48 שעות</p>
        <div className="form-grid">
          <div className="field full"><label>כותרת</label>
            <input type="text" placeholder="לדוגמה: שמלת ערב אדומה זוהרת" value={v.title} onChange={(e) => set("title", e.target.value)} />
            {errors.title && <span className="err">{errors.title}</span>}</div>

          <div className="field full"><label>תיאור</label>
            <textarea rows="3" placeholder="ספרי על השמלה — סגנון, גזרה, מתי נלבשה…" value={v.desc} onChange={(e) => set("desc", e.target.value)} />
            {errors.desc && <span className="err">{errors.desc}</span>}</div>

          <div className="field"><label>צבע</label>
            <input type="text" placeholder="לדוגמה: אדום" value={v.color} onChange={(e) => set("color", e.target.value)} /></div>

          <div className="field"><label>מצב השמלה</label>
            <select value={v.condition} onChange={(e) => set("condition", e.target.value)}>
              <option value="">בחרי…</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.condition && <span className="err">{errors.condition}</span>}</div>

          <div className="field"><label>אורך שמלה</label>
            <select value={v.dressLength} onChange={(e) => set("dressLength", e.target.value)}>
              <option value="">בחרי…</option>{DRESS_LENGTHS.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.dressLength && <span className="err">{errors.dressLength}</span>}</div>

          <div className="field"><label>אורך שרוול</label>
            <select value={v.sleeveLength} onChange={(e) => set("sleeveLength", e.target.value)}>
              <option value="">בחרי…</option>{SLEEVE_LENGTHS.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.sleeveLength && <span className="err">{errors.sleeveLength}</span>}</div>

          <div className="field"><label>מחיר להשכרה ₪</label>
            <input type="number" placeholder="0" value={v.price} onChange={(e) => set("price", e.target.value)} />
            {errors.price && <span className="err">{errors.price}</span>}</div>

          <div className="field"><label>אזור</label>
            <select value={v.region} onChange={(e) => set("region", e.target.value)}>
              <option value="">בחרי…</option>{REGIONS.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.region && <span className="err">{errors.region}</span>}</div>

          <div className="field"><label>עיר</label>
            <input type="text" placeholder="לדוגמה: תל אביב" value={v.city} onChange={(e) => set("city", e.target.value)} /></div>

          <div className="field"><label>מידה</label>
            <select value={v.size} onChange={(e) => set("size", e.target.value)}>
              <option value="">בחרי…</option>{SIZES.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.size && <span className="err">{errors.size}</span>}</div>

          <div className="field"><label>מקור</label>
            <select value={v.source} onChange={(e) => set("source", e.target.value)}>
              <option value="">בחרי…</option><option>תפירה אישית</option><option>שם חנות</option>
            </select>{errors.source && <span className="err">{errors.source}</span>}</div>

          {v.source === "שם חנות" && <div className="field"><label>שם החנות</label>
            <input type="text" placeholder="שם החנות" value={v.store} onChange={(e) => set("store", e.target.value)} />
            {errors.store && <span className="err">{errors.store}</span>}</div>}

          <div className="field"><label>טלפון (לוואטסאפ, לא יוצג במלואו)</label>
            <input type="tel" placeholder="05X-XXXXXXX" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            {errors.phone && <span className="err">{errors.phone}</span>}</div>

          <div className="field"><label>מייל (לעדכונים)</label>
            {isLoggedIn ? (
              <>
                <input type="email" value={v.email} disabled className="opacity-70" />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  מחוברת כ-{v.email} — המודעה תופיע תחת "השמלות שלי" בתפריט המשתמש שלך
                </p>
              </>
            ) : (
              <input type="email" placeholder="your@email.com" value={v.email} onChange={(e) => set("email", e.target.value)} />
            )}
            {errors.email && <span className="err">{errors.email}</span>}</div>

          <div className="field full"><label>תמונות (עד 3)</label>
            <ImageUploader images={images} setImages={setImages} max={MAX_IMAGES} error={errors.images} />
          </div>

          <div className="full mt-2">
            <div className="notice-box">
              <p className="notice-box-title">אחריות</p>
              <p className="notice-box-text">
                האתר אינו אחראי על כל נזק, פגם או גניבה של השמלה. למשתמשות באתר אין כל טענה משפטית כלפי בעל האתר בעניינים אלה.
              </p>
              <label className="notice-box-check">
                <input
                  type="checkbox"
                  checked={agreeLiability}
                  onChange={(e) => { setAgreeLiability(e.target.checked); if (e.target.checked) setErrors((p) => ({ ...p, liability: undefined })); }}
                />
                קראתי ואני מאשרת
              </label>
              {errors.liability && <span className="err">{errors.liability}</span>}
            </div>

            <div className="notice-box">
              <p className="notice-box-title">עמלת שימוש</p>
              <p className="notice-box-text">
                יש לשלם עמלה בשיעור 10% מכל עסקה שנסגרת דרך האתר. את התשלום יש להעביר באמצעות שירות הלקוחות.
              </p>
              <label className="notice-box-check">
                <input
                  type="checkbox"
                  checked={agreeFee}
                  onChange={(e) => { setAgreeFee(e.target.checked); if (e.target.checked) setErrors((p) => ({ ...p, fee: undefined })); }}
                />
                קראתי ואני מאשרת
              </label>
              {errors.fee && <span className="err">{errors.fee}</span>}
            </div>

            <button className="btn btn-rose btn-block" onClick={submit}>פרסום השמלה</button>
            <div className="mt-[14px] text-center"><span className="link-rose" onClick={goHome}>חזרה לעמוד הבית</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
