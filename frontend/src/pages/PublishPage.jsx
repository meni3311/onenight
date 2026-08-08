import { useState, useRef, useEffect } from "react";
import { REGIONS, SIZES, LENGTHS, CONDITIONS, DRESS_LENGTHS, SLEEVE_LENGTHS } from "../lib/data.js";
import { DEFAULT_DRESS_COLOR_HEX } from "../constants/theme.js";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = {
  title: "", desc: "", color: "", condition: "", length: "", price: "",
  region: "", size: "", source: "", store: "", phone: "", email: "",
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
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  /* Ownership is keyed by the account's email (see AccountPage's "my
     listings" filter) — while signed in, lock the field to that address
     instead of a free-typed one so the listing reliably shows up under
     "השמלות שהעליתי" afterwards. Re-syncs if the user logs in mid-visit
     (the auth modal is reachable from the navbar on every page). */
  useEffect(() => {
    if (isLoggedIn && account?.email) set("email", account.email);
  }, [isLoggedIn, account?.email]);

  const handleFiles = (list) => {
    const arr = Array.from(list).slice(0, MAX_IMAGES - images.length);
    arr.forEach((file) => {
      const r = new FileReader();
      r.onload = (e) => setImages((p) => (p.length < MAX_IMAGES ? [...p, e.target.result] : p));
      r.readAsDataURL(file);
    });
  };
  const validate = () => {
    const e = {};
    if (!v.title.trim()) e.title = "נא להזין כותרת";
    if (!v.desc.trim()) e.desc = "נא להזין תיאור";
    if (!v.condition) e.condition = "נא לבחור מצב";
    if (!v.length) e.length = "נא לבחור אורך";
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };
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

          <div className="field"><label>אורך</label>
            <select value={v.length} onChange={(e) => set("length", e.target.value)}>
              <option value="">בחרי…</option>{LENGTHS.map((c) => <option key={c}>{c}</option>)}
            </select>{errors.length && <span className="err">{errors.length}</span>}</div>

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
            <div className={"dropzone" + (drag ? " drag" : "")}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
              {images.length < MAX_IMAGES ? "גררי לכאן תמונות או לחצי לבחירה" : "הגעת למקסימום (3 תמונות)"}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            {errors.images && <span className="err">{errors.images}</span>}
            {images.length > 0 && <div className="thumbs">
              {images.map((src, i) => (<div key={i} className="thumb">
                <img src={src} alt="" /><button onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>✕</button>
              </div>))}
            </div>}
          </div>

          <div className="full mt-2">
            <button className="btn btn-rose btn-block" onClick={submit}>פרסום השמלה</button>
            <div className="mt-[14px] text-center"><span className="link-rose" onClick={goHome}>חזרה לעמוד הבית</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
