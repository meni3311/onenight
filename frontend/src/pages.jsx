/* ============================================================
   Page-level components: Publish, ThankYou, Auth, Account, Admin
   ============================================================ */
import { useState, useRef } from "react";
import { REGIONS, SIZES, LENGTHS, CONDITIONS, placeholder } from "./data.js";
import { api } from "./api.js";
import { DressCard, Calendar } from "./components.jsx";

/* ---------- Publish form ---------- */
export function PublishPage({ onSubmit, goHome }){
  const empty = { title: "", desc: "", color: "", condition: "", length: "", price: "", region: "", size: "", source: "", store: "", phone: "", email: "" };
  const [v, setV] = useState(empty);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  const handleFiles = (list) => {
    const arr = Array.from(list).slice(0, 3 - images.length);
    arr.forEach(file => {
      const r = new FileReader();
      r.onload = e => setImages(p => p.length < 3 ? [...p, e.target.result] : p);
      r.readAsDataURL(file);
    });
  };
  const validate = () => {
    const e = {};
    if(!v.title.trim()) e.title = "נא להזין כותרת";
    if(!v.desc.trim()) e.desc = "נא להזין תיאור";
    if(!v.condition) e.condition = "נא לבחור מצב";
    if(!v.length) e.length = "נא לבחור אורך";
    if(!v.price || +v.price <= 0) e.price = "נא להזין מחיר";
    if(!v.region) e.region = "נא לבחור אזור";
    if(!v.size) e.size = "נא לבחור מידה";
    if(!v.source) e.source = "נא לבחור מקור";
    if(v.source === "שם חנות" && !v.store.trim()) e.store = "נא להזין שם חנות";
    if(!/^0\d{8,9}$/.test(v.phone.trim())) e.phone = "מספר טלפון לא תקין";
    if(!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "כתובת מייל לא תקינה";
    if(images.length === 0) e.images = "נא להעלות לפחות תמונה אחת";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => {
    if(!validate()){ window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    onSubmit({ ...v, price: +v.price, images, colorHex: "#C4A0A0" });
  };

  return (
    <div className="container page" style={{ paddingTop: 40 }}>
      <div className="form-card">
        <h2>פרסום שמלה</h2>
        <p className="form-sub">ללא צורך בהרשמה · נבדוק את המודעה ונחזור אלייך תוך 24–48 שעות</p>
        <div className="form-grid">
          <div className="field full"><label>כותרת</label>
            <input type="text" placeholder="לדוגמה: שמלת ערב אדומה זוהרת" value={v.title} onChange={e => set("title", e.target.value)} />
            {errors.title && <span className="err">{errors.title}</span>}</div>

          <div className="field full"><label>תיאור</label>
            <textarea rows="3" placeholder="ספרי על השמלה — סגנון, גזרה, מתי נלבשה…" value={v.desc} onChange={e => set("desc", e.target.value)} />
            {errors.desc && <span className="err">{errors.desc}</span>}</div>

          <div className="field"><label>צבע</label>
            <input type="text" placeholder="לדוגמה: אדום" value={v.color} onChange={e => set("color", e.target.value)} /></div>

          <div className="field"><label>מצב השמלה</label>
            <select value={v.condition} onChange={e => set("condition", e.target.value)}>
              <option value="">בחרי…</option>{CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>{errors.condition && <span className="err">{errors.condition}</span>}</div>

          <div className="field"><label>אורך</label>
            <select value={v.length} onChange={e => set("length", e.target.value)}>
              <option value="">בחרי…</option>{LENGTHS.map(c => <option key={c}>{c}</option>)}
            </select>{errors.length && <span className="err">{errors.length}</span>}</div>

          <div className="field"><label>מחיר להשכרה ₪</label>
            <input type="number" placeholder="0" value={v.price} onChange={e => set("price", e.target.value)} />
            {errors.price && <span className="err">{errors.price}</span>}</div>

          <div className="field"><label>אזור</label>
            <select value={v.region} onChange={e => set("region", e.target.value)}>
              <option value="">בחרי…</option>{REGIONS.map(c => <option key={c}>{c}</option>)}
            </select>{errors.region && <span className="err">{errors.region}</span>}</div>

          <div className="field"><label>מידה</label>
            <select value={v.size} onChange={e => set("size", e.target.value)}>
              <option value="">בחרי…</option>{SIZES.map(c => <option key={c}>{c}</option>)}
            </select>{errors.size && <span className="err">{errors.size}</span>}</div>

          <div className="field"><label>מקור</label>
            <select value={v.source} onChange={e => set("source", e.target.value)}>
              <option value="">בחרי…</option><option>תפירה אישית</option><option>שם חנות</option>
            </select>{errors.source && <span className="err">{errors.source}</span>}</div>

          {v.source === "שם חנות" && <div className="field"><label>שם החנות</label>
            <input type="text" placeholder="שם החנות" value={v.store} onChange={e => set("store", e.target.value)} />
            {errors.store && <span className="err">{errors.store}</span>}</div>}

          <div className="field"><label>טלפון (לוואטסאפ, לא יוצג במלואו)</label>
            <input type="tel" placeholder="05X-XXXXXXX" value={v.phone} onChange={e => set("phone", e.target.value)} />
            {errors.phone && <span className="err">{errors.phone}</span>}</div>

          <div className="field"><label>מייל (לעדכונים)</label>
            <input type="email" placeholder="your@email.com" value={v.email} onChange={e => set("email", e.target.value)} />
            {errors.email && <span className="err">{errors.email}</span>}</div>

          <div className="field full"><label>תמונות (עד 3)</label>
            <div className={"dropzone" + (drag ? " drag" : "")}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
              {images.length < 3 ? "גררי לכאן תמונות או לחצי לבחירה" : "הגעת למקסימום (3 תמונות)"}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            {errors.images && <span className="err">{errors.images}</span>}
            {images.length > 0 && <div className="thumbs">
              {images.map((src, i) => (<div key={i} className="thumb">
                <img src={src} alt="" /><button onClick={() => setImages(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>))}
            </div>}
          </div>

          <div className="full" style={{ marginTop: 8 }}>
            <button className="btn btn-rose btn-block" onClick={submit}>פרסום השמלה</button>
            <div style={{ textAlign: "center", marginTop: 14 }}><span className="link-rose" onClick={goHome}>חזרה לעמוד הבית</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Thank-you ---------- */
export function ThankYou({ goHome }){
  return (
    <div className="thankyou">
      <div className="gold-rule" style={{ width: 60, height: 1, background: "var(--gold)", marginBottom: 24 }}></div>
      <h1>השמלה שלך בדרך לבמה ✨</h1>
      <p>קיבלנו את המודעה שלך ואנחנו בודקות אותה בקפידה. תוך 24–48 שעות תקבלי עדכון במייל. תודה שבחרת להיות חלק מהקהילה שלנו 💚</p>
      <span className="link-rose" onClick={goHome}>חזרה לעמוד הבית</span>
    </div>
  );
}

/* ---------- Auth (login / register) ---------- */
export function AuthPage({ mode: initMode, onAuth, goHome, toast }){
  const [mode, setMode] = useState(initMode || "login");
  const [v, setV] = useState({ name: "", email: "", city: "", phone: "", password: "" });
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("form");
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  const startRegister = () => {
    if(!v.name || !v.phone || !v.password){ toast("נא למלא שם, טלפון וסיסמה"); return; }
    // TODO: real SMS via Twilio. Demo: pretend code is 1234
    setStage("verify");
    toast("נשלח קוד אימות (לצורך הדגמה: 1234)");
  };
  const verify = async () => {
    if(code !== "1234"){ toast("קוד שגוי — נסי 1234 להדגמה"); return; }
    try{
      const user = await api("/api/auth/register", { method: "POST", body: {
        name: v.name, email: v.email, city: v.city, phone: v.phone, password: v.password,
      }});
      onAuth(user);
    }catch(e){ toast(e.message); }
  };
  const login = async () => {
    if(!v.phone || !v.password){ toast("נא להזין טלפון וסיסמה"); return; }
    try{
      const user = await api("/api/auth/login", { method: "POST", body: { phone: v.phone, password: v.password } });
      onAuth(user);
    }catch(e){ toast(e.message); }
  };

  return (
    <div className="container page" style={{ paddingTop: 50 }}>
      <div className="form-card" style={{ maxWidth: 440 }}>
        <h2>{mode === "login" ? "כניסה" : "הרשמה"}</h2>
        <p className="form-sub">{mode === "login" ? "שמחות לראות אותך שוב" : "הצטרפי לקהילת onenight"}</p>

        {stage === "form" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && <>
            <div className="field"><label>שם מלא</label><input type="text" value={v.name} onChange={e => set("name", e.target.value)} /></div>
            <div className="field"><label>מייל</label><input type="email" value={v.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="field"><label>מקום מגורים</label><input type="text" value={v.city} onChange={e => set("city", e.target.value)} /></div>
          </>}
          <div className="field"><label>טלפון</label><input type="tel" placeholder="05X-XXXXXXX" value={v.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div className="field"><label>סיסמה</label><input type="password" value={v.password} onChange={e => set("password", e.target.value)} /></div>
          <button className="btn btn-rose btn-block" onClick={mode === "login" ? login : startRegister}>
            {mode === "login" ? "כניסה" : "המשך לאימות"}
          </button>
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
            {mode === "login" ? <>אין לך חשבון? <span className="link-rose" onClick={() => setMode("register")}>להרשמה</span></>
              : <>כבר רשומה? <span className="link-rose" onClick={() => setMode("login")}>לכניסה</span></>}
          </div>
        </div>}

        {stage === "verify" && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center" }}>הזיני את קוד האימות שנשלח ל-{v.phone}</p>
          <div className="field"><label>קוד אימות (SMS)</label><input type="text" placeholder="1234" value={code} onChange={e => setCode(e.target.value)} /></div>
          <button className="btn btn-rose btn-block" onClick={verify}>אימות והרשמה</button>
        </div>}
      </div>
    </div>
  );
}

/* ---------- Account area ---------- */
function EditFields({ d, setD }){
  const set = (k, val) => setD(p => ({ ...p, [k]: val }));
  return (
    <div className="form-grid" style={{ marginTop: 12 }}>
      <div className="field full"><label>כותרת</label><input type="text" value={d.title} onChange={e => set("title", e.target.value)} /></div>
      <div className="field full"><label>תיאור</label><textarea rows="2" value={d.desc} onChange={e => set("desc", e.target.value)} /></div>
      <div className="field"><label>צבע</label><input type="text" value={d.color} onChange={e => set("color", e.target.value)} /></div>
      <div className="field"><label>מחיר ₪</label><input type="number" value={d.price} onChange={e => set("price", +e.target.value)} /></div>
      <div className="field"><label>מצב</label><select value={d.condition} onChange={e => set("condition", e.target.value)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>אורך</label><select value={d.length} onChange={e => set("length", e.target.value)}>{LENGTHS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>אזור</label><select value={d.region} onChange={e => set("region", e.target.value)}>{REGIONS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>מידה</label><select value={d.size} onChange={e => set("size", e.target.value)}>{SIZES.map(c => <option key={c}>{c}</option>)}</select></div>
    </div>
  );
}

export function AccountPage({ user, dresses, setDresses, favIds, dressById, onOpen, onFav, setUser, toast }){
  const [tab, setTab] = useState("ads");
  const [editing, setEditing] = useState(null);
  const myAds = dresses.filter(d => d.phone === user.phone);
  const favs = favIds.map(dressById).filter(Boolean);

  const saveEdit = async () => {
    try{
      const updated = await api("/api/dresses/" + editing.id, { method: "PATCH", body: {
        title: editing.title, desc: editing.desc, color: editing.color, price: +editing.price,
        condition: editing.condition, length: editing.length, region: editing.region, size: editing.size,
      }});
      setDresses(p => p.map(d => d.id === updated.id ? updated : d));
      setEditing(null); toast("הפרטים עודכנו ✓");
    }catch(e){ toast("עדכון נכשל: " + e.message); }
  };
  const toggleDate = async (dressId, key) => {
    setDresses(p => p.map(d => d.id === dressId ? { ...d, booked: d.booked.includes(key) ? d.booked.filter(x => x !== key) : [...d.booked, key] } : d));
    try{ await api("/api/dresses/" + dressId + "/booked", { method: "PATCH", body: { key } }); }
    catch(e){ toast("שמירת היומן נכשלה: " + e.message); }
  };

  return (
    <div className="container page" style={{ paddingTop: 30 }}>
      <h2 className="section-title">האזור האישי · שלום {user.name}</h2>
      <div className="tabs">
        {[["ads", "המודעות שלי"], ["cal", "יומן זמינות"], ["favs", "מועדפים"], ["account", "פרטי חשבון"]].map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "ads" && (myAds.length ? myAds.map(d => (
        <div key={d.id} className="admin-row">
          <img src={d.images[0]} alt="" onError={e => e.target.src = placeholder(d.colorHex, d.title)} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <strong className="serif" style={{ fontSize: 20 }}>{d.title}</strong>
              <span className={"status-pill status-" + d.status}>{d.status === "approved" ? "מאושרת" : d.status === "pending" ? "ממתינה" : "נדחתה"}</span>
            </div>
            <div className="card-meta">מידה {d.size} · {d.region} · {d.price} ₪</div>
            {editing && editing.id === d.id ? <EditFields d={editing} setD={setEditing} /> :
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditing(d)}>✏️ עריכה</button>
                <button className="btn btn-ghost" onClick={() => onOpen(d)}>תצוגה</button>
              </div>}
            {editing && editing.id === d.id && <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn btn-sage" onClick={saveEdit}>שמירה</button>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>ביטול</button>
            </div>}
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>לשינוי תמונה יש לפנות לשירות לקוחות</p>
          </div>
        </div>
      )) : <div className="empty">עדיין אין לך מודעות. <span className="link-rose" onClick={() => toast("מעבר לפרסום שמלה")}>פרסמי שמלה ראשונה</span></div>)}

      {tab === "cal" && (myAds.length ? myAds.map(d => (
        <div key={d.id} style={{ marginBottom: 24 }}>
          <strong className="serif" style={{ fontSize: 19 }}>{d.title}</strong>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 10px" }}>סמני תאריכים שבהם השמלה אינה זמינה</p>
          <div style={{ maxWidth: 320 }}><Calendar booked={d.booked} editable onToggle={k => toggleDate(d.id, k)} /></div>
        </div>
      )) : <div className="empty">אין מודעות להצגת יומן.</div>)}

      {tab === "favs" && (favs.length ? <div className="grid">
        {favs.map(d => <DressCard key={d.id} d={d} fav={true} onFav={onFav} onOpen={onOpen} onShare={() => toast("שיתוף")} />)}
      </div> : <div className="empty">עדיין אין מועדפים — לחצי על הלב בשמלות שאהבת ♡</div>)}

      {tab === "account" && <div className="form-card" style={{ maxWidth: 440, margin: 0 }}>
        <div className="field" style={{ marginBottom: 14 }}><label>שם מלא</label><input type="text" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></div>
        <div className="field" style={{ marginBottom: 14 }}><label>מייל</label><input type="email" value={user.email || ""} onChange={e => setUser({ ...user, email: e.target.value })} /></div>
        <div className="field" style={{ marginBottom: 14 }}><label>מקום מגורים</label><input type="text" value={user.city || ""} onChange={e => setUser({ ...user, city: e.target.value })} /></div>
        <div className="field" style={{ marginBottom: 18 }}><label>טלפון</label><input type="tel" value={user.phone} disabled style={{ opacity: .7 }} /></div>
        <button className="btn btn-rose btn-block" onClick={() => toast("פרטי החשבון נשמרו ✓")}>שמירת שינויים</button>
      </div>}
    </div>
  );
}

/* ---------- Email stub (would call Resend/EmailJS) ---------- */
function sendEmail(type, d){
  const link = location.origin + location.pathname + "#dress=" + d.id;
  if(type === "approve"){
    console.log("[EMAIL → " + d.email + "] נושא: השמלה שלך התקבלה לאתר onenight! 🎉\n" +
      'שלום, שמחות לבשר שהשמלה "' + d.title + '" עלתה לאתר ומחכה לשוכרת הבאה. צפייה: ' + link);
  } else {
    console.log("[EMAIL → " + d.email + "] נושא: עדכון לגבי המודעה שלך ב-onenight\n" +
      'שלום, לצערנו המודעה "' + d.title + '" לא אושרה כרגע. סיבה: ' + (d.rejectReason || "") + ". נשמח שתעדכני ותשלחי שוב 💛");
  }
}

/* ---------- Admin panel ---------- */
export function AdminPage({ dresses, setDresses, toast }){
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  if(!authed) return (
    <div className="container page" style={{ paddingTop: 50 }}>
      <div className="form-card" style={{ maxWidth: 400 }}>
        <h2>כניסת מנהלת</h2>
        <p className="form-sub">אזור מוגן — בעלות האתר בלבד</p>
        <div className="field" style={{ marginBottom: 16 }}><label>סיסמה</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="הסיסמה: onenight2026" /></div>
        <button className="btn btn-rose btn-block" onClick={async () => {
          try{
            const r = await api("/api/admin/login", { method: "POST", body: { password: pw } });
            if(r && r.ok){ setAuthed(true); } else { toast("סיסמה שגויה"); }
          }catch(e){ toast("סיסמה שגויה"); }
        }}>כניסה</button>
      </div>
    </div>
  );

  const filtered = dresses.filter(d => d.status === tab);
  const approve = async (d) => {
    try{
      const up = await api("/api/dresses/" + d.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "approved" } });
      setDresses(p => p.map(x => x.id === d.id ? up : x));
      toast("השמלה אושרה ✓ — נשלח מייל למפרסמת");
      sendEmail("approve", d);
    }catch(e){ toast("אישור נכשל: " + e.message); }
  };
  const doReject = async () => {
    try{
      const up = await api("/api/dresses/" + rejecting.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "rejected", rejectReason: reason } });
      setDresses(p => p.map(x => x.id === rejecting.id ? up : x));
      sendEmail("reject", { ...rejecting, rejectReason: reason });
      toast("השמלה נדחתה — נשלח מייל למפרסמת");
      setRejecting(null); setReason("");
    }catch(e){ toast("דחייה נכשלה: " + e.message); }
  };

  return (
    <div className="container page" style={{ paddingTop: 30 }}>
      <h2 className="section-title">פאנל ניהול</h2>
      <div className="tabs">
        {[["pending", "ממתינות"], ["approved", "מאושרות"], ["rejected", "נדחו"]].map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
            {l} ({dresses.filter(d => d.status === k).length})
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty">אין שמלות בקטגוריה זו.</div>}
      {filtered.map(d => {
        const wa = `https://wa.me/972${d.phone.replace(/^0/, "")}?text=${encodeURIComponent('היי, קיבלנו את המודעה שלך לשמלה ' + d.title + '. התמונה שצירפת לא ברורה מספיק — תשמחי לשלוח תמונה טובה יותר? 🙏')}`;
        return (
          <div key={d.id} className="admin-row">
            <img src={d.images[0]} alt="" onError={e => e.target.src = placeholder(d.colorHex, d.title)} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong className="serif" style={{ fontSize: 20 }}>{d.title}</strong>
                <span className={"status-pill status-" + d.status}>{d.status === "approved" ? "מאושרת" : d.status === "pending" ? "ממתינה" : "נדחתה"}</span>
              </div>
              <div className="card-meta">{d.color} · מידה {d.size} · {d.length} · {d.region} · {d.price} ₪</div>
              <div className="card-meta">מקור: {d.source === "שם חנות" ? d.store : d.source} · טלפון: {d.phone} · {d.email}</div>
              <p style={{ fontSize: 13, margin: "6px 0", color: "var(--text)" }}>{d.desc}</p>
              {d.rejectReason && <p className="err">סיבת דחייה: {d.rejectReason}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {d.status !== "approved" && <button className="btn btn-sage" onClick={() => approve(d)}>✅ אישור</button>}
                {d.status !== "rejected" && <button className="btn btn-ghost" onClick={() => setRejecting(d)}>❌ דחייה</button>}
                <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener">📱 בקשת תמונה</a>
              </div>
              {rejecting && rejecting.id === d.id && <div style={{ marginTop: 10 }}>
                <input type="text" placeholder="סיבת הדחייה (תופיע במייל למפרסמת)" value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8 }} />
                <button className="btn btn-rose" onClick={doReject} disabled={!reason.trim()}>שליחת דחייה</button>
                <button className="btn btn-ghost" style={{ marginInlineStart: 8 }} onClick={() => setRejecting(null)}>ביטול</button>
              </div>}
            </div>
          </div>);
      })}
    </div>
  );
}
