import { useState, useEffect } from "react";
import { placeholder } from "../lib/data.js";
import { api } from "../lib/api.js";
import { ImageUploader } from "../components/ui/ImageUploader.jsx";

const STATUS_LABELS = { approved: "מאושרת", pending: "ממתינה", rejected: "נדחתה" };
const TABS = [["pending", "ממתינות"], ["approved", "מאושרות"], ["rejected", "נדחו"]];

/* Email stub — in production this would call Resend / EmailJS. */
function sendEmail(type, d) {
  const link = location.origin + location.pathname + "#dress=" + d.id;
  if (type === "approve") {
    console.log("[EMAIL → " + d.email + "] נושא: השמלה שלך התקבלה לאתר onenight! 🎉\n" +
      'שלום, שמחות לבשר שהשמלה "' + d.title + '" עלתה לאתר ומחכה לשוכרת הבאה. צפייה: ' + link);
  } else {
    console.log("[EMAIL → " + d.email + "] נושא: עדכון לגבי המודעה שלך ב-onenight\n" +
      'שלום, לצערנו המודעה "' + d.title + '" לא אושרה כרגע. סיבה: ' + (d.rejectReason || "") + ". נשמח שתעדכני ותשלחי שוב 💛");
  }
}

/* Booking-inquiry helpers — these hit the real NestJS/Prisma backend
   directly (via fetch, same pattern as AuthContext/ProductPage's
   logBookingInquiry), not the localStorage-backed `api()` mock the rest of
   this page uses for dresses. */
const waLink = (phone) => `https://wa.me/972${(phone || "").replace(/^0/, "")}`;
const fmtDateTime = (iso) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
const fmtDate = (iso) => new Date(iso).toLocaleDateString("he-IL");

/* Owner-only moderation panel: approve / reject submitted dresses. */
export default function AdminPage({ dresses, setDresses, toast, dressById, onOpen }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [editingImages, setEditingImages] = useState(null); // dress id currently being edited
  const [draftImages, setDraftImages] = useState([]);

  // Booking inquiries ("להזמנה" click log) — lazily loaded from the real
  // backend the first (and every subsequent) time this tab is opened, so
  // the list stays fresh across admin sessions without a manual refresh button.
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  const loadInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const res = await fetch("/api/booking-inquiries", { headers: { "x-admin-password": pw } });
      if (!res.ok) throw new Error("שגיאת שרת");
      setInquiries(await res.json());
    } catch (e) {
      toast("טעינת בקשות ההזמנה נכשלה: " + e.message);
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "inquiries" && authed) loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);

  const deleteInquiry = async (id) => {
    try {
      const res = await fetch("/api/booking-inquiries/" + id, {
        method: "DELETE",
        headers: { "x-admin-password": pw },
      });
      if (!res.ok) throw new Error("שגיאת שרת");
      setInquiries((p) => p.filter((x) => x.id !== id));
      toast("הבקשה נמחקה");
    } catch (e) {
      toast("מחיקת הבקשה נכשלה: " + e.message);
    }
  };

  if (!authed) return (
    <div className="container page pt-[50px]">
      <div className="form-card max-w-[400px]">
        <h2>כניסת מנהלת</h2>
        <p className="form-sub">אזור מוגן — בעלות האתר בלבד</p>
        <div className="field mb-4"><label>סיסמה</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="הסיסמה: onenight2026" /></div>
        <button className="btn btn-rose btn-block" onClick={async () => {
          try {
            const r = await api("/api/admin/login", { method: "POST", body: { password: pw } });
            if (r && r.ok) { setAuthed(true); } else { toast("סיסמה שגויה"); }
          } catch (e) { toast("סיסמה שגויה"); }
        }}>כניסה</button>
      </div>
    </div>
  );

  const filtered = dresses.filter((d) => d.status === tab);
  const approve = async (d) => {
    try {
      const up = await api("/api/dresses/" + d.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "approved" } });
      setDresses((p) => p.map((x) => (x.id === d.id ? up : x)));
      toast("השמלה אושרה ✓ — נשלח מייל למפרסמת");
      sendEmail("approve", d);
    } catch (e) { toast("אישור נכשל: " + e.message); }
  };
  const doReject = async () => {
    try {
      const up = await api("/api/dresses/" + rejecting.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "rejected", rejectReason: reason } });
      setDresses((p) => p.map((x) => (x.id === rejecting.id ? up : x)));
      sendEmail("reject", { ...rejecting, rejectReason: reason });
      toast("השמלה נדחתה — נשלח מייל למפרסמת");
      setRejecting(null); setReason("");
    } catch (e) { toast("דחייה נכשלה: " + e.message); }
  };

  /* Edit the images on a listing request — same `images` field the listing
     itself renders from, so once approved the edited set is what's live. */
  const startEditingImages = (d) => { setEditingImages(d.id); setDraftImages(d.images); };
  const cancelEditingImages = () => { setEditingImages(null); setDraftImages([]); };
  const saveImages = async () => {
    try {
      const up = await api("/api/dresses/" + editingImages, { method: "PATCH", body: { images: draftImages } });
      setDresses((p) => p.map((x) => (x.id === up.id ? up : x)));
      toast("התמונות עודכנו ✓");
      setEditingImages(null); setDraftImages([]);
    } catch (e) { toast("עדכון התמונות נכשל: " + e.message); }
  };

  return (
    <div className="container page pt-[30px]">
      <h2 className="section-title">פאנל ניהול</h2>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
            {l} ({dresses.filter((d) => d.status === k).length})
          </button>
        ))}
        <button className={"tab" + (tab === "inquiries" ? " on" : "")} onClick={() => setTab("inquiries")}>
          בקשות הזמנה
        </button>
      </div>

      {tab === "inquiries" ? (
        <>
          {inquiriesLoading && <div className="empty">טוען בקשות…</div>}
          {!inquiriesLoading && inquiries.length === 0 && <div className="empty">אין בקשות הזמנה עדיין.</div>}
          {!inquiriesLoading && inquiries.map((inq) => {
            const dress = dressById && dressById(inq.dressId);
            return (
              <div key={inq.id} className="admin-row">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <strong className="serif text-[20px]">{inq.dressTitle}</strong>
                    <span className="card-meta">נשלח: {fmtDateTime(inq.createdAt)}</span>
                  </div>
                  <div className="card-meta">
                    תאריכי השכרה מבוקשים: {fmtDate(inq.selectedStartDate)} – {fmtDate(inq.selectedEndDate)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a className="btn btn-ghost" href={waLink(inq.renterPhone)} target="_blank" rel="noopener">
                      📱 שוכרת: {inq.renterPhone}
                    </a>
                    <a className="btn btn-ghost" href={waLink(inq.ownerPhone)} target="_blank" rel="noopener">
                      📱 מפרסמת: {inq.ownerPhone}
                    </a>
                    {dress ? (
                      <button className="btn btn-ghost" onClick={() => onOpen && onOpen(dress)}>👗 צפייה בשמלה</button>
                    ) : (
                      <span className="card-meta">השמלה כבר לא זמינה</span>
                    )}
                    <button className="btn btn-rose" onClick={() => deleteInquiry(inq.id)}>🗑️ מחיקה</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
      <>
      {filtered.length === 0 && <div className="empty">אין שמלות בקטגוריה זו.</div>}
      {filtered.map((d) => {
        const wa = `https://wa.me/972${d.phone.replace(/^0/, "")}?text=${encodeURIComponent('היי, קיבלנו את המודעה שלך לשמלה ' + d.title + '. התמונה שצירפת לא ברורה מספיק — תשמחי לשלוח תמונה טובה יותר? 🙏')}`;
        return (
          <div key={d.id} className="admin-row">
            <img src={d.images[0]} alt="" onError={(e) => (e.target.src = placeholder(d.colorHex, d.title))} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <strong className="serif text-[20px]">{d.title}</strong>
                <span className={"status-pill status-" + d.status}>{STATUS_LABELS[d.status]}</span>
              </div>
              <div className="card-meta">{d.color} · מידה {d.size} · {d.region} · {d.price} ₪</div>
              <div className="card-meta">מקור: {d.source === "שם חנות" ? d.store : d.source} · טלפון: {d.phone} · {d.email}</div>
              <p className="my-1.5 text-[13px] text-[var(--text)]">{d.desc}</p>
              {d.rejectReason && <p className="err">סיבת דחייה: {d.rejectReason}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {d.status !== "approved" && <button className="btn btn-sage" onClick={() => approve(d)}>✅ אישור</button>}
                {d.status !== "rejected" && <button className="btn btn-ghost" onClick={() => setRejecting(d)}>❌ דחייה</button>}
                <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener">📱 בקשת תמונה</a>
                {editingImages === d.id
                  ? <button className="btn btn-ghost" onClick={cancelEditingImages}>ביטול עריכת תמונות</button>
                  : <button className="btn btn-ghost" onClick={() => startEditingImages(d)}>🖼️ עריכת תמונות</button>}
              </div>
              {editingImages === d.id && <div className="mt-2.5">
                <ImageUploader images={draftImages} setImages={setDraftImages} max={3} />
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-sage" onClick={saveImages} disabled={draftImages.length === 0}>שמירת תמונות</button>
                  <button className="btn btn-ghost" onClick={cancelEditingImages}>ביטול</button>
                </div>
              </div>}
              {rejecting && rejecting.id === d.id && <div className="mt-2.5">
                <input type="text" placeholder="סיבת הדחייה (תופיע במייל למפרסמת)" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2 w-full rounded-lg border border-[var(--border)] p-2.5" />
                <button className="btn btn-rose" onClick={doReject} disabled={!reason.trim()}>שליחת דחייה</button>
                <button className="btn btn-ghost ms-2" onClick={() => setRejecting(null)}>ביטול</button>
              </div>}
            </div>
          </div>);
      })}
      </>
      )}
    </div>
  );
}
