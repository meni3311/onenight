import { useState, useEffect } from "react";
import { placeholder } from "../lib/data.js";
import { api } from "../lib/api.js";
import { AdminPhotosPanel } from "../components/admin/AdminPhotosPanel.jsx";
import { useSessionStorage } from "../hooks/useSessionStorage.js";

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

/* Booking-inquiry helpers — raw fetch rather than the shared `api()` helper,
   same pattern as AuthContext/ProductPage's logBookingInquiry. Both reach the
   same NestJS/Prisma backend now that the dress calls on this page are no
   longer served by a localStorage mock. */
const waLink = (phone) => `https://wa.me/972${(phone || "").replace(/^0/, "")}`;
const fmtDateTime = (iso) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
const fmtDate = (iso) => new Date(iso).toLocaleDateString("he-IL");

/* Owner-only moderation panel: approve / reject submitted dresses. */
export default function AdminPage({ dresses, setDresses, toast, dressById, onOpen }) {
  /* The admin "session" is the password itself — AdminGuard re-checks it on
     every privileged call and no token is ever issued (see admin.guard.ts),
     so there is nothing else to persist. Held in sessionStorage rather than
     React state so a refresh doesn't drop it, and rather than localStorage
     so it doesn't outlive the tab; see useSessionStorage for that tradeoff.

     `authed` is intentionally NOT persisted alongside it. It's derived on
     mount by re-validating the stored password (see below), so a password
     that has since changed server-side can't leave the screen rendering a
     queue whose every action will 401. */
  const [pw, setPw] = useSessionStorage("onenight_admin_pw", "");
  const [authed, setAuthed] = useState(false);
  /* Blocks the login form for the one round trip that re-validation takes,
     so a returning admin doesn't see the password prompt flash before the
     panel appears. */
  const [rehydrating, setRehydrating] = useState(() => !!pw);
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  // Dress id whose AI photo / manage-images panel is open.
  const [aiImagining, setAiImagining] = useState(null);

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

  /* Rehydrate the admin session on mount.
     The stored password is re-checked against the server rather than
     trusted, so it can't outlive a change to ADMIN_PASSWORD — that check is
     this app's stand-in for token expiry, since the guard has no notion of
     one. A rejected or errored password is cleared, dropping the admin back
     to the login form instead of into a panel where every button 401s.
     Runs once; the login form handles the interactive path. */
  useEffect(() => {
    if (!pw) { setRehydrating(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await api("/api/admin/login", { method: "POST", body: { password: pw } });
        if (cancelled) return;
        if (r && r.ok) setAuthed(true);
        else setPw("");
      } catch {
        // Network failure, not a wrong password — clear anyway rather than
        // showing a panel we can't confirm is authorised.
        if (!cancelled) setPw("");
      } finally {
        if (!cancelled) setRehydrating(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminLogout = () => {
    setPw("");
    setAuthed(false);
    setInquiries([]);
    toast("יצאת מפאנל הניהול");
  };

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

  /* Held back until the stored password has been re-validated, so a refresh
     goes straight to the panel instead of flashing the login form first. */
  if (rehydrating) return (
    <div className="container page pt-[50px]"><div className="empty">טוענת…</div></div>
  );

  if (!authed) return (
    <div className="container page pt-[50px]">
      <div className="form-card max-w-[400px]">
        <h2>כניסת מנהלת</h2>
        <p className="form-sub">אזור מוגן — בעלות האתר בלבד</p>
        <div className="field mb-4"><label>סיסמה</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="הסיסמה:" /></div>
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

  const toggleAiImagining = (d) => {
    setAiImagining((p) => (p === d.id ? null : d.id));
  };

  return (
    <div className="container page pt-[30px]">
      {/* Explicit logout matters now that the session survives a refresh —
          without it the only way out is closing the tab. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">פאנל ניהול</h2>
        <button className="btn btn-ghost" onClick={adminLogout}>יציאה</button>
      </div>
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
                <button className="btn btn-ghost" onClick={() => toggleAiImagining(d)}>
                  {aiImagining === d.id ? "סגירת ניהול תמונות" : "🖼️ ניהול תמונות"}
                </button>
              </div>
              {aiImagining === d.id && <div className="mt-2.5">
                <AdminPhotosPanel
                  dress={d}
                  adminPw={pw}
                  toast={toast}
                  onUpdated={(fresh) => setDresses((p) => p.map((x) => (x.id === fresh.id ? fresh : x)))}
                />
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
