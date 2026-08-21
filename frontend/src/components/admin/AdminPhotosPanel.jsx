import { useState } from "react";
import {
  api,
  aiGenerateDressPhotos,
  adminAddDressImage,
  adminRemoveDressImage,
} from "../../lib/api.js";
import { ImageUploader } from "../ui/ImageUploader.jsx";
import { ConfirmModal } from "../ui/ConfirmModal.jsx";

const MAX_PER_RUN = 6;

const MAX_GALLERY = 8;

export function AdminPhotosPanel({ dress, adminPw, onUpdated, toast }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState([]);
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [downloading, setDownloading] = useState([]);

  const photos = dress.photos || [];
  const running = busy.length > 0;
  const atCap = photos.length >= MAX_GALLERY;
  const isLastPhoto = photos.length <= 1;

  const toggle = (id) => {
    if (running) return;
    setErrors((p) => {
      if (!p[id]) return p;
      const next = { ...p };
      delete next[id];
      return next;
    });
    setSelected((p) =>
      p.includes(id)
        ? p.filter((x) => x !== id)
        : p.length >= MAX_PER_RUN
          ? p
          : [...p, id],
    );
  };

  const appendUploaded = async (updater) => {
    const next = typeof updater === "function" ? updater([]) : updater;
    const urls = next || [];
    if (!urls.length) return;

    setAdding(true);
    try {
      for (const url of urls) {
        const fresh = await adminAddDressImage(dress.id, url, adminPw);
        onUpdated(fresh);
      }
    } catch (e) {
      toast("הוספת התמונה נכשלה: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    if (removeBusy) return;
    setRemoveBusy(true);
    try {
      const fresh = await adminRemoveDressImage(dress.id, removing.id, adminPw);
      onUpdated(fresh);
      setSelected((p) => p.filter((x) => x !== removing.id));
      setRemoving(null);
      toast("התמונה נמחקה");
    } catch (e) {
      toast("מחיקת התמונה נכשלה: " + e.message);
    } finally {
      setRemoveBusy(false);
    }
  };

  const downloadImage = async (photo, index) => {
    if (downloading.includes(photo.id)) return;
    setDownloading((p) => [...p, photo.id]);
    try {
      const res = await fetch(photo.url);
      if (!res.ok) throw new Error("שגיאת שרת");
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const base = (dress.title || "dress")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "dress";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${base}-${index + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast("הורדת התמונה נכשלה: " + e.message);
    } finally {
      setDownloading((p) => p.filter((id) => id !== photo.id));
    }
  };

  const generate = async () => {
    if (!selected.length || running) return;
    const batch = selected;
    setBusy(batch);
    setErrors({});

    try {
      const results = await aiGenerateDressPhotos(dress.id, batch, adminPw);

      const failed = {};
      let ok = 0;
      for (const r of results) {
        if (r.status === "success") ok++;
        else failed[r.sourceImageId] = r.error || "יצירת התמונה נכשלה";
      }
      setErrors(failed);
      setSelected(batch.filter((id) => failed[id]));

      if (ok > 0) {
        const fresh = await api("/api/dresses/" + dress.id);
        onUpdated(fresh);
        toast(
          batch.length === 1
            ? "נוצרה תמונה חדשה והוגדרה כתמונה הראשית ✨"
            : `נוצרו ${ok} תמונות ונוספו לגלריה ✨`,
        );
      }
      if (ok === 0) toast("יצירת התמונות נכשלה — ראי פירוט על התמונות");
    } catch (e) {
      toast("יצירת התמונות נכשלה: " + e.message);
    } finally {
      setBusy([]);
    }
  };

  const generateLabel = running
    ? `יוצרת ${busy.length} תמונות…`
    : selected.length === 1
      ? "✨ AI Imagine — תחליף לתמונה הראשית"
      : `✨ AI Imagine — הוספת ${selected.length} תמונות לגלריה`;

  return (
    <div className="ai-panel">
      <p className="card-meta">
        התמונה הראשונה היא התמונה הראשית של המודעה. בחרי תמונות ליצירת צילום על
        דוגמנית — תמונה אחת תחליף את התמונה הראשית, יותר מאחת יתווספו לגלריה.
      </p>

      {photos.length === 0 ? (
        <p className="card-meta">אין תמונות למודעה הזו.</p>
      ) : (
        <div className="thumbs">
          {photos.map((photo, i) => {
            const isSelected = selected.includes(photo.id);
            const isBusy = busy.includes(photo.id);
            const error = errors[photo.id];
            return (
              <div key={photo.id} className="ai-thumb-wrap">
                <button
                  type="button"
                  className={
                    "ai-thumb" + (isSelected ? " on" : "") + (error ? " failed" : "")
                  }
                  onClick={() => toggle(photo.id)}
                  disabled={running}
                  aria-pressed={isSelected}
                  aria-label={
                    (i === 0 ? "תמונה ראשית. " : "") +
                    (photo.isAiGenerated ? "תמונה שנוצרה ב-AI" : "תמונה שהועלתה") +
                    (isSelected ? " — נבחרה" : "")
                  }
                >
                  <img src={photo.url} alt="" />
                  {photo.isAiGenerated && <span className="ai-badge">AI</span>}
                  {isBusy && (
                    <span className="ai-thumb-busy" role="status">
                      <span className="ai-spinner" aria-hidden="true" />
                    </span>
                  )}
                </button>

                {}
                <button
                  type="button"
                  className="ai-thumb-download"
                  onClick={() => downloadImage(photo, i)}
                  disabled={downloading.includes(photo.id)}
                  title="הורדת התמונה למכשיר"
                  aria-label="הורדת התמונה למכשיר"
                >
                  {downloading.includes(photo.id) ? "…" : "⬇"}
                </button>
                <button
                  type="button"
                  className="ai-thumb-remove"
                  onClick={() => setRemoving(photo)}
                  disabled={running || isLastPhoto}
                  title={
                    isLastPhoto
                      ? "לכל שמלה חייבת להיות לפחות תמונה אחת"
                      : "מחיקת התמונה"
                  }
                  aria-label="מחיקת התמונה"
                >
                  ✕
                </button>

                {i === 0 && <span className="ai-thumb-cover">ראשית</span>}
                {error && <span className="err ai-thumb-err">{error}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <p className="text-[13px] font-semibold text-[var(--text)]">הוספת תמונה</p>
        {atCap ? (
          <p className="card-meta">
            הגלריה מלאה ({MAX_GALLERY} תמונות). כדי להוסיף תמונה חדשה יש למחוק אחת קיימת.
          </p>
        ) : (
          <ImageUploader
            images={[]}
            setImages={appendUploaded}
            max={MAX_GALLERY - photos.length}
            dressId={dress.id}
          />
        )}
        {adding && <p className="card-meta">מוסיפה תמונה…</p>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          className="btn btn-rose"
          onClick={generate}
          disabled={!selected.length || running}
        >
          {running && <span className="btn-spinner" aria-hidden="true" />}
          {generateLabel}
        </button>
        {selected.length > 0 && !running && (
          <button className="btn btn-ghost" onClick={() => setSelected([])}>
            ניקוי בחירה
          </button>
        )}
      </div>

      <ConfirmModal
        open={!!removing}
        title="למחוק את התמונה?"
        message={
          removing
            ? "התמונה תימחק מהגלריה ומהאחסון ולא ניתן יהיה לשחזר אותה." +
              (photos[0] && removing.id === photos[0].id
                ? " זו התמונה הראשית — התמונה הבאה בתור תיכנס במקומה."
                : "")
            : ""
        }
        confirmLabel={removeBusy ? "מוחקת…" : "כן, מחקי"}
        cancelLabel="ביטול"
        busy={removeBusy}
        onConfirm={confirmRemove}
        onCancel={() => { if (!removeBusy) setRemoving(null); }}
      />
    </div>
  );
}
