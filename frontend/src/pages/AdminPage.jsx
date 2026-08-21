import { useState, useEffect } from "react";
import { placeholder, CATEGORIES, CATEGORY_LABELS } from "../lib/data.js";
import {
  api,
  deleteContactInquiry,
  getAdminDresses,
  getContactInquiries,
  getDress,
  setContactInquiryHandled,
  withBase,
} from "../lib/api.js";
import { AdminPhotosPanel } from "../components/admin/AdminPhotosPanel.jsx";
import { useSessionStorage } from "../hooks/useSessionStorage.js";

const STATUS_LABELS = { approved: "מאושרת", pending: "ממתינה", rejected: "נדחתה" };
const TABS = [["pending", "ממתינות"], ["approved", "מאושרות"], ["rejected", "נדחו"]];

const NON_QUEUE_TABS = new Set(["inquiries", "contact"]);

function decisionToast(base, res) {
  const n = res?.notification;
  if (!n) return base;
  if (n.emailSent) return `${base} — נשלח מייל למפרסמת`;
  return `${base} — אך ${n.emailError || "שליחת המייל נכשלה"}`;
}

const waLink = (phone) => `https://wa.me/972${(phone || "").replace(/^0/, "")}`;
const fmtDateTime = (iso) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
const fmtDate = (iso) => new Date(iso).toLocaleDateString("he-IL");

export default function AdminPage({ toast, onOpen }) {
  const [pw, setPw] = useSessionStorage("onenight_admin_pw", "");
  const [authed, setAuthed] = useState(false);
  const [rehydrating, setRehydrating] = useState(() => !!pw);
  const [tab, setTab] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [aiImagining, setAiImagining] = useState(null);

  const [dresses, setDresses] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [queueLoading, setQueueLoading] = useState(false);

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  const loadInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const res = await fetch(withBase("/api/booking-inquiries"), { headers: { "x-admin-password": pw } });
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

  const [contactInquiries, setContactInquiries] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);

  const loadContactInquiries = async () => {
    setContactLoading(true);
    try {
      setContactInquiries(await getContactInquiries(pw));
    } catch (e) {
      toast("טעינת הפניות נכשלה: " + e.message);
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "contact" && authed) loadContactInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);

  const toggleContactHandled = async (inq) => {
    try {
      const updated = await setContactInquiryHandled(inq.id, !inq.handled, pw);
      setContactInquiries((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      toast("עדכון הפנייה נכשל: " + e.message);
    }
  };

  const removeContactInquiry = async (id) => {
    try {
      await deleteContactInquiry(id, pw);
      setContactInquiries((p) => p.filter((x) => x.id !== id));
      toast("הפנייה נמחקה");
    } catch (e) {
      toast("מחיקת הפנייה נכשלה: " + e.message);
    }
  };

  const loadQueue = async (status, category) => {
    setQueueLoading(true);
    try {
      const res = await getAdminDresses(status, pw, 1, category);
      setDresses(res?.items || []);
      if (res?.counts) setCounts(res.counts);
    } catch (e) {
      toast("טעינת המודעות נכשלה: " + e.message);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (!authed || NON_QUEUE_TABS.has(tab)) return;
    loadQueue(tab, categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, categoryFilter]);

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
    setContactInquiries([]);
    toast("יצאת מפאנל הניהול");
  };

  const deleteInquiry = async (id) => {
    try {
      const res = await fetch(withBase("/api/booking-inquiries/" + id), {
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

  const filtered = dresses;

  const applyDecision = (id, from, to) => {
    setDresses((p) => p.filter((x) => x.id !== id));
    setCounts((c) => ({ ...c, [from]: Math.max(0, (c[from] || 0) - 1), [to]: (c[to] || 0) + 1 }));
  };

  const approve = async (d) => {
    try {
      const res = await api("/api/dresses/" + d.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "approved" } });
      applyDecision(d.id, d.status, "approved");
      toast(decisionToast("השמלה אושרה ✓", res));
    } catch (e) { toast("אישור נכשל: " + e.message); }
  };
  const doReject = async () => {
    try {
      const res = await api("/api/dresses/" + rejecting.id + "/status", { method: "PATCH", adminPw: pw, body: { status: "rejected", rejectReason: reason } });
      applyDecision(rejecting.id, rejecting.status, "rejected");
      toast(decisionToast("השמלה נדחתה", res));
      setRejecting(null); setReason("");
    } catch (e) { toast("דחייה נכשלה: " + e.message); }
  };

  const toggleAiImagining = (d) => {
    setAiImagining((p) => (p === d.id ? null : d.id));
  };

  const openInquiryDress = async (dressId) => {
    try {
      const dress = await getDress(dressId);
      onOpen && onOpen(dress);
    } catch {
      toast("השמלה כבר לא זמינה");
    }
  };

  return (
    <div className="container page pt-[30px]">
      {}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">פאנל ניהול</h2>
        <button className="btn btn-ghost" onClick={adminLogout}>יציאה</button>
      </div>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
            {l} ({counts[k] ?? 0})
          </button>
        ))}
        <button className={"tab" + (tab === "inquiries" ? " on" : "")} onClick={() => setTab("inquiries")}>
          בקשות הזמנה
        </button>
        {}
        <button className={"tab" + (tab === "contact" ? " on" : "")} onClick={() => setTab("contact")}>
          פניות
          {contactInquiries.length > 0
            ? ` (${contactInquiries.filter((x) => !x.handled).length})`
            : ""}
        </button>
      </div>

      {}
      {!NON_QUEUE_TABS.has(tab) && (
        <div className="chips mb-3">
          <button
            type="button"
            aria-pressed={categoryFilter === ""}
            className={"chip" + (categoryFilter === "" ? " on" : "")}
            onClick={() => setCategoryFilter("")}
          >
            כל הקטגוריות
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={categoryFilter === c.value}
              className={"chip" + (categoryFilter === c.value ? " on" : "")}
              onClick={() => setCategoryFilter(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {tab === "inquiries" ? (
        <>
          {inquiriesLoading && <div className="empty">טוען בקשות…</div>}
          {!inquiriesLoading && inquiries.length === 0 && <div className="empty">אין בקשות הזמנה עדיין.</div>}
          {!inquiriesLoading && inquiries.map((inq) => {
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
                    <button className="btn btn-ghost" onClick={() => openInquiryDress(inq.dressId)}>
                      👗 צפייה בשמלה
                    </button>
                    <button className="btn btn-rose" onClick={() => deleteInquiry(inq.id)}>🗑️ מחיקה</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : tab === "contact" ? (
        <>
          {contactLoading && <div className="empty">טוענת פניות…</div>}
          {!contactLoading && contactInquiries.length === 0 && (
            <div className="empty">אין פניות עדיין.</div>
          )}
          {!contactLoading && contactInquiries.map((c) => (
            <div
              key={c.id}
              className="admin-row"
              style={c.handled ? { opacity: 0.55 } : undefined}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <strong className="serif text-[20px]">{c.name}</strong>
                  {c.handled && <span className="status-pill status-approved">טופלה</span>}
                  <span className="card-meta">נשלח: {fmtDateTime(c.createdAt)}</span>
                </div>
                <div className="card-meta">
                  {}
                  <span dir="ltr">{c.email}</span>
                </div>
                {}
                <p className="my-1.5 whitespace-pre-line text-[13px] text-[var(--text)]">{c.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="btn btn-ghost"
                    href={`mailto:${c.email}?subject=${encodeURIComponent("בנוגע לפנייתך ל-onenight")}`}
                  >
                    ✉️ מענה במייל
                  </a>
                  <button className="btn btn-ghost" onClick={() => toggleContactHandled(c)}>
                    {c.handled ? "↩️ סימון כלא טופלה" : "✅ סימון כטופלה"}
                  </button>
                  <button className="btn btn-rose" onClick={() => removeContactInquiry(c.id)}>🗑️ מחיקה</button>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
      <>
      {queueLoading && <div className="empty">טוען מודעות…</div>}
      {!queueLoading && filtered.length === 0 && <div className="empty">אין שמלות בקטגוריה זו.</div>}
      {!queueLoading && filtered.map((d) => {
        const wa = `https://wa.me/972${d.phone.replace(/^0/, "")}?text=${encodeURIComponent('היי, קיבלנו את המודעה שלך לשמלה ' + d.title + '. התמונה שצירפת לא ברורה מספיק — תשמחי לשלוח תמונה טובה יותר? 🙏')}`;
        return (
          <div key={d.id} className="admin-row">
            <img src={d.images[0]} alt="" onError={(e) => (e.target.src = placeholder(d.colorHex, d.title))} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <strong className="serif text-[20px]">{d.title}</strong>
                <span className={"status-pill status-" + d.status}>{STATUS_LABELS[d.status]}</span>
              </div>
              <div className="card-meta">
                {CATEGORY_LABELS[d.category] || "—"}
                {d.category === "bridesmaid" && d.bridesmaidSetCount ? ` (סט של ${d.bridesmaidSetCount})` : ""}
                {" · "}{d.color} · מידות {(d.sizes || []).join(", ") || "—"} · {d.region} · {d.price} ₪
              </div>
              <div className="card-meta">מקור: {d.source === "שם חנות" ? d.store : d.source} · טלפון: {d.phone} · {d.email}</div>
              {d.hashtags?.length > 0 && (
                <div className="card-meta">תגיות: {d.hashtags.map((t) => `#${t}`).join(" ")}</div>
              )}
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
