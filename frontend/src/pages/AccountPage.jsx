import { useState, useEffect } from "react";
import { REGIONS, SIZES, LENGTHS, CONDITIONS, placeholder } from "../lib/data.js";
import { api } from "../lib/api.js";
import { Calendar } from "../components/calendar/Calendar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/* Inline edit form for one of the user's dress listings. */
function EditFields({ d, setD }) {
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  return (
    <div className="form-grid mt-3">
      <div className="field full"><label>כותרת</label><input type="text" value={d.title} onChange={(e) => set("title", e.target.value)} /></div>
      <div className="field full"><label>תיאור</label><textarea rows="2" value={d.desc} onChange={(e) => set("desc", e.target.value)} /></div>
      <div className="field"><label>צבע</label><input type="text" value={d.color} onChange={(e) => set("color", e.target.value)} /></div>
      <div className="field"><label>מחיר ₪</label><input type="number" value={d.price} onChange={(e) => set("price", +e.target.value)} /></div>
      <div className="field"><label>מצב</label><select value={d.condition} onChange={(e) => set("condition", e.target.value)}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>אורך</label><select value={d.length} onChange={(e) => set("length", e.target.value)}>{LENGTHS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>אזור</label><select value={d.region} onChange={(e) => set("region", e.target.value)}>{REGIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>מידה</label><select value={d.size} onChange={(e) => set("size", e.target.value)}>{SIZES.map((c) => <option key={c}>{c}</option>)}</select></div>
    </div>
  );
}

const STATUS_LABELS = { approved: "מאושרת", pending: "ממתינה", rejected: "נדחתה" };
const TABS = [["ads", "המודעות שלי"], ["cal", "יומן זמינות"], ["account", "פרטי חשבון"]];

/* Signed-in user's area: their listings, availability calendars, and
   editable account details. Favorites live on their own page, reached
   via "המועדפים שלי" in the personal-area dropdown — not a tab here. */
export default function AccountPage({ user, dresses, setDresses, onOpen, setUser, toast, initialTab }) {
  const { requestPublish } = useAuth();
  const [tab, setTab] = useState(initialTab || "ads");
  const [editing, setEditing] = useState(null);

  /* Route stays "account" across dropdown clicks (e.g. listings → profile),
     so the page doesn't remount — resync the active tab when it changes. */
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  /* Ownership is keyed by email (the account identity from the OTP auth
     flow), not phone — the OTP flow never collects a phone number, so
     phone-based matching left every account's listings empty. */
  const myEmail = (user.email || "").trim().toLowerCase();
  const myAds = myEmail
    ? dresses.filter((d) => (d.email || "").trim().toLowerCase() === myEmail)
    : [];

  const saveEdit = async () => {
    try {
      const updated = await api("/api/dresses/" + editing.id, { method: "PATCH", body: {
        title: editing.title, desc: editing.desc, color: editing.color, price: +editing.price,
        condition: editing.condition, length: editing.length, region: editing.region, size: editing.size,
      } });
      setDresses((p) => p.map((d) => (d.id === updated.id ? updated : d)));
      setEditing(null); toast("הפרטים עודכנו ✓");
    } catch (e) { toast("עדכון נכשל: " + e.message); }
  };
  const toggleDate = async (dressId, key) => {
    setDresses((p) => p.map((d) => (d.id === dressId ? { ...d, booked: d.booked.includes(key) ? d.booked.filter((x) => x !== key) : [...d.booked, key] } : d)));
    try { await api("/api/dresses/" + dressId + "/booked", { method: "PATCH", body: { key } }); }
    catch (e) { toast("שמירת היומן נכשלה: " + e.message); }
  };

  return (
    <div className="container page pt-[30px]">
      <h2 className="section-title">האזור האישי · שלום {user.name}</h2>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "ads" && (myAds.length ? myAds.map((d) => (
        <div key={d.id} className="admin-row">
          <img src={d.images[0]} alt="" onError={(e) => (e.target.src = placeholder(d.colorHex, d.title))} />
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <strong className="serif text-[20px]">{d.title}</strong>
              <span className={"status-pill status-" + d.status}>{STATUS_LABELS[d.status]}</span>
            </div>
            <div className="card-meta">מידה {d.size} · {d.region} · {d.price} ₪</div>
            {editing && editing.id === d.id ? <EditFields d={editing} setD={setEditing} /> :
              <div className="mt-2.5 flex gap-2">
                <button className="btn btn-ghost" onClick={() => setEditing(d)}>✏️ עריכה</button>
                <button className="btn btn-ghost" onClick={() => onOpen(d)}>תצוגה</button>
              </div>}
            {editing && editing.id === d.id && <div className="mt-2.5 flex gap-2">
              <button className="btn btn-sage" onClick={saveEdit}>שמירה</button>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>ביטול</button>
            </div>}
            <p className="mt-2 text-[12px] text-[var(--muted)]">לשינוי תמונה יש לפנות לשירות לקוחות</p>
          </div>
        </div>
      )) : <div className="empty">עדיין אין לך מודעות. <span className="link-rose" onClick={requestPublish}>פרסמי שמלה ראשונה</span></div>)}

      {tab === "cal" && (myAds.length ? myAds.map((d) => (
        <div key={d.id} className="mb-6">
          <strong className="serif text-[19px]">{d.title}</strong>
          <p className="mx-0 mb-2.5 mt-1 text-[13px] text-[var(--muted)]">סמני תאריכים שבהם השמלה אינה זמינה</p>
          <div className="max-w-[320px]"><Calendar booked={d.booked} editable onToggle={(k) => toggleDate(d.id, k)} /></div>
        </div>
      )) : <div className="empty">אין מודעות להצגת יומן.</div>)}

      {tab === "account" && <div className="form-card m-0 max-w-[440px]">
        <div className="field mb-[14px]"><label>שם מלא</label><input type="text" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} /></div>
        <div className="field mb-[14px]"><label>מייל</label><input type="email" value={user.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} /></div>
        <div className="field mb-[14px]"><label>מקום מגורים</label><input type="text" value={user.city || ""} onChange={(e) => setUser({ ...user, city: e.target.value })} /></div>
        <div className="field mb-[18px]"><label>טלפון</label><input type="tel" value={user.phone} disabled className="opacity-70" /></div>
        <button className="btn btn-rose btn-block" onClick={() => toast("פרטי החשבון נשמרו ✓")}>שמירת שינויים</button>
      </div>}
    </div>
  );
}
