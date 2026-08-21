import { useState, useEffect } from "react";
import { REGIONS, SIZES, CONDITIONS, CATEGORIES, CATEGORY_LABELS, placeholder } from "../lib/data.js";
import { api, deleteDress, getDressInquiryCount, getMyDresses, sendOtp, deleteAccount } from "../lib/api.js";
import { SizeMultiSelect } from "../components/ui/SizeMultiSelect.jsx";
import { HashtagInput } from "../components/ui/HashtagInput.jsx";
import { DressAvailabilityCalendar } from "../components/calendar/DressAvailabilityCalendar.jsx";
import { ConfirmModal } from "../components/ui/ConfirmModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const OTP_RE = /^\d{6}$/;

function EditFields({ d, setD }) {
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  return (
    <div className="form-grid mt-3">
      <div className="field full"><label>כותרת</label><input type="text" value={d.title} onChange={(e) => set("title", e.target.value)} /></div>

      <div className="field full"><label>קטגוריה</label>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={d.category === c.value}
              className={"chip" + (d.category === c.value ? " on" : "")}
              onClick={() => setD((p) => ({
                ...p,
                category: c.value,
                bridesmaidSetCount: c.value === "bridesmaid" ? p.bridesmaidSetCount : null,
              }))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {d.category === "bridesmaid" && (
        <div className="field"><label>כמה שמלות בסט</label>
          <input
            type="number" min="2" max="20"
            value={d.bridesmaidSetCount ?? ""}
            onChange={(e) => set("bridesmaidSetCount", e.target.value === "" ? null : +e.target.value)}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">נא לפרט בתיאור את השמלות שבסט ואת המידות שלהן</p>
        </div>
      )}

      <div className="field full"><label>תיאור</label><textarea rows="2" value={d.desc} onChange={(e) => set("desc", e.target.value)} /></div>
      <div className="field"><label>צבע</label><input type="text" value={d.color} onChange={(e) => set("color", e.target.value)} /></div>
      <div className="field"><label>מחיר ₪</label><input type="number" value={d.price} onChange={(e) => set("price", +e.target.value)} /></div>
      <div className="field"><label>מצב</label><select value={d.condition} onChange={(e) => set("condition", e.target.value)}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>אזור</label><select value={d.region} onChange={(e) => set("region", e.target.value)}>{REGIONS.map((c) => <option key={c}>{c}</option>)}</select></div>

      <div className="field full"><label>מידות</label>
        <SizeMultiSelect options={SIZES} value={d.sizes || []} onChange={(next) => set("sizes", next)} />
      </div>

      <div className="field full"><label>תגיות</label>
        <HashtagInput value={d.hashtags || []} onChange={(next) => set("hashtags", next)} />
      </div>
    </div>
  );
}

const STATUS_LABELS = { approved: "מאושרת", pending: "ממתינה", rejected: "נדחתה" };
const TABS = [["ads", "המודעות שלי"], ["account", "פרטי חשבון"]];

export default function AccountPage({ user, onOpen, setUser, toast, initialTab }) {
  const { requestPublish, logout } = useAuth();
  const [tab, setTab] = useState(initialTab || "ads");
  const [dresses, setDresses] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteInquiries, setDeleteInquiries] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [acctDeleteConfirm, setAcctDeleteConfirm] = useState(false);
  const [acctDeleteOtp, setAcctDeleteOtp] = useState(false);
  const [acctDeleteCode, setAcctDeleteCode] = useState("");
  const [acctDeleteError, setAcctDeleteError] = useState("");
  const [acctDeleteBusy, setAcctDeleteBusy] = useState(false);

  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const myEmail = (user.email || "").trim().toLowerCase();

  useEffect(() => {
    if (!myEmail) { setDresses([]); setAdsLoading(false); return; }
    let cancelled = false;
    setAdsLoading(true);
    getMyDresses(myEmail)
      .then((rows) => { if (!cancelled) setDresses(rows || []); })
      .catch((e) => { if (!cancelled) toast("טעינת המודעות שלך נכשלה: " + e.message); })
      .finally(() => { if (!cancelled) setAdsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail]);

  const myAds = dresses;

  const saveEdit = async () => {
    try {
      const updated = await api("/api/dresses/" + editing.id, { method: "PATCH", body: {
        title: editing.title, desc: editing.desc, color: editing.color, price: +editing.price,
        condition: editing.condition, region: editing.region,
        sizes: editing.sizes, category: editing.category, hashtags: editing.hashtags,
        ...(editing.category === "bridesmaid"
          ? { bridesmaidSetCount: +editing.bridesmaidSetCount }
          : {}),
      } });
      setDresses((p) => p.map((d) => (d.id === updated.id ? updated : d)));
      setEditing(null); toast("הפרטים עודכנו ✓");
    } catch (e) { toast("עדכון נכשל: " + e.message); }
  };
  const askDelete = (d) => {
    setDeleting(d);
    setDeleteInquiries(null);
    getDressInquiryCount(d.id)
      .then((r) => setDeleteInquiries(r?.count ?? 0))
      .catch(() => setDeleteInquiries(0));
  };

  const confirmDelete = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    try {
      await deleteDress(deleting.id, myEmail);
      setDresses((p) => p.filter((d) => d.id !== deleting.id));
      if (editing && editing.id === deleting.id) setEditing(null);
      setDeleting(null);
      toast("המודעה נמחקה");
    } catch (e) {
      toast("מחיקת המודעה נכשלה: " + e.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleDate = async (dressId, key) => {
    setDresses((p) => p.map((d) => (d.id === dressId ? { ...d, booked: d.booked.includes(key) ? d.booked.filter((x) => x !== key) : [...d.booked, key] } : d)));
    try { await api("/api/dresses/" + dressId + "/booked", { method: "PATCH", body: { key } }); }
    catch (e) { toast("שמירת היומן נכשלה: " + e.message); }
  };

  const sendAcctDeleteCode = async () => {
    if (acctDeleteBusy) return;
    setAcctDeleteBusy(true);
    setAcctDeleteError("");
    try {
      await sendOtp(myEmail);
      setAcctDeleteConfirm(false);
      setAcctDeleteCode("");
      setAcctDeleteOtp(true);
      toast("קוד אימות נשלח למייל שלך");
    } catch (e) {
      toast("שליחת קוד האימות נכשלה: " + e.message);
    } finally {
      setAcctDeleteBusy(false);
    }
  };

  const confirmAcctDelete = async () => {
    if (acctDeleteBusy) return;
    if (!OTP_RE.test(acctDeleteCode)) { setAcctDeleteError("יש להזין קוד בן 6 ספרות"); return; }
    setAcctDeleteBusy(true);
    setAcctDeleteError("");
    try {
      await deleteAccount(myEmail, acctDeleteCode);
      setAcctDeleteOtp(false);
      toast("החשבון נמחק. תודה שהיית איתנו 💛");
      logout();
    } catch (e) {
      setAcctDeleteError(e.message);
    } finally {
      setAcctDeleteBusy(false);
    }
  };

  return (
    <div className="container page pt-[30px]">
      <h2 className="section-title">האזור האישי · שלום {user.name}</h2>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "ads" && adsLoading && <div className="empty">טוען את המודעות שלך…</div>}

      {tab === "ads" && !adsLoading && (myAds.length ? myAds.map((d) => (
        <div key={d.id} className="admin-row owner-row">
          <img src={d.images[0]} alt="" onError={(e) => (e.target.src = placeholder(d.colorHex, d.title))} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <strong className="serif text-[20px]">{d.title}</strong>
              <span className={"status-pill status-" + d.status}>{STATUS_LABELS[d.status]}</span>
            </div>
            <div className="card-meta">
              {CATEGORY_LABELS[d.category] || "—"} · מידות {(d.sizes || []).join(", ") || "—"} · {d.region} · {d.price} ₪
            </div>
            {editing && editing.id === d.id ? <EditFields d={editing} setD={setEditing} /> :
              <div className="mt-2.5 flex flex-wrap gap-2 [&>*]:flex-1">
                <button className="btn btn-ghost" onClick={() => setEditing(d)}>✏️ עריכה</button>
                <button className="btn btn-ghost" onClick={() => onOpen(d)}>תצוגה</button>
                <button className="btn btn-ghost btn-danger" onClick={() => askDelete(d)}>🗑️ מחיקה</button>
              </div>}
            {editing && editing.id === d.id && <div className="mt-2.5 flex flex-wrap gap-2 [&>*]:flex-1">
              <button className="btn btn-sage" onClick={saveEdit}>שמירה</button>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>ביטול</button>
            </div>}
            {editing && editing.id === d.id && (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <p className="text-[13px] font-semibold text-[var(--text)]">יומן זמינות</p>
                <p className="mx-0 mb-2.5 mt-1 text-[13px] text-[var(--muted)]">סמני תאריכים שבהן השמלה אינה זמינה</p>
                <DressAvailabilityCalendar booked={d.booked} onToggle={(k) => toggleDate(d.id, k)} />
              </div>
            )}
            <p className="mt-2 text-[12px] text-[var(--muted)]">לשינוי תמונה יש לפנות לשירות לקוחות</p>
          </div>
        </div>
      )) : <div className="empty">עדיין אין לך מודעות. <span className="link-rose" onClick={requestPublish}>פרסמי שמלה ראשונה</span></div>)}

      {tab === "account" && <div className="form-card m-0 max-w-[440px]">
        <div className="field mb-[14px]"><label>שם מלא</label><input type="text" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} /></div>
        <div className="field mb-[14px]"><label>מייל</label><input type="email" value={user.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} /></div>
        <div className="field mb-[14px]"><label>מקום מגורים</label><input type="text" value={user.city || ""} onChange={(e) => setUser({ ...user, city: e.target.value })} /></div>
        <div className="field mb-[18px]"><label>טלפון</label><input type="tel" value={user.phone} disabled className="opacity-70" /></div>
        <button className="btn btn-rose btn-block" onClick={() => toast("פרטי החשבון נשמרו ✓")}>שמירת שינויים</button>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="text-[13px] font-semibold text-[var(--text)]">מחיקת חשבון</p>
          <p className="card-meta mt-1">מחיקת החשבון היא פעולה בלתי הפיכה ולא ניתן לשחזר אותה.</p>
          <button
            type="button"
            className="btn btn-ghost btn-danger mt-2.5"
            onClick={() => { setAcctDeleteError(""); setAcctDeleteConfirm(true); }}
          >
            מחיקת חשבון
          </button>
        </div>
      </div>}

      {}
      <ConfirmModal
        open={acctDeleteConfirm}
        title="למחוק את החשבון?"
        message={
          "הפעולה בלתי הפיכה. במחיקת החשבון יימחקו לצמיתות: פרטי הפרופיל שלך, " +
          "כל המודעות שפרסמת והתמונות שלהן. בקשות הזמנה שכבר נשלחו יישארו ברישומי " +
          "האתר כדי שנוכל להמשיך ולטפל בהן, בלי לזהות אותך."
        }
        confirmLabel={acctDeleteBusy ? "שולחת קוד…" : "כן, שליחת קוד אימות"}
        cancelLabel="ביטול"
        busy={acctDeleteBusy}
        onConfirm={sendAcctDeleteCode}
        onCancel={() => { if (!acctDeleteBusy) setAcctDeleteConfirm(false); }}
      />

      {}
      <ConfirmModal
        open={acctDeleteOtp}
        title="אימות מחיקת חשבון"
        message={`שלחנו קוד בן 6 ספרות ל-${myEmail}. הזיני אותו כדי למחוק את החשבון לצמיתות.`}
        confirmLabel={acctDeleteBusy ? "מוחקת…" : "מחיקת החשבון לצמיתות"}
        cancelLabel="ביטול"
        busy={acctDeleteBusy}
        onConfirm={confirmAcctDelete}
        onCancel={() => { if (!acctDeleteBusy) setAcctDeleteOtp(false); }}
      >
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          maxLength={6}
          value={acctDeleteCode}
          onChange={(e) => setAcctDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="קוד בן 6 ספרות"
          className="w-full rounded-lg border border-[var(--border)] p-2.5 text-center"
          style={{ letterSpacing: "6px", fontSize: "1.1rem" }}
        />
        {acctDeleteError && <p className="err mt-2">{acctDeleteError}</p>}
        <button type="button" className="btn btn-ghost btn-block mt-2.5" disabled={acctDeleteBusy} onClick={sendAcctDeleteCode}>
          לא קיבלתי קוד — שלחי שוב
        </button>
      </ConfirmModal>

      {}
      <ConfirmModal
        open={!!deleting}
        title="למחוק את המודעה?"
        message={deleting ? (
          `"${deleting.title}" והתמונות שלה יימחקו לצמיתות ולא ניתן יהיה לשחזר אותן.` +
          (deleteInquiries > 0
            ? ` שימי לב: יש ${deleteInquiries} בקשות הזמנה למודעה הזו. הפרטים יישמרו אצלנו כדי שנוכל לחזור לשוכרות, אבל המודעה עצמה תיעלם מהאתר.`
            : "")
        ) : ""}
        confirmLabel={deleteBusy ? "מוחקת…" : "כן, מחקי"}
        cancelLabel="ביטול"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleteBusy) setDeleting(null); }}
      />
    </div>
  );
}
