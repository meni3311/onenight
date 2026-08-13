import { useState } from "react";
import {
  api,
  aiGenerateDressPhotos,
  adminAddDressImage,
  adminRemoveDressImage,
} from "../../lib/api.js";
import { ImageUploader } from "../ui/ImageUploader.jsx";
import { ConfirmModal } from "../ui/ConfirmModal.jsx";

/* Admin-only photo management for one listing: add a photo, remove a photo,
   and turn existing photos into AI on-model shots.

   Every action here writes to the server immediately — there is no separate
   draft-and-save panel anymore, this is the only place an admin manages a
   listing's images. It addresses images by id, which a flat URL list can't
   express.

   The first photo in the grid is the listing's cover (lowest `order`), which
   is why removing one re-packs the ordering server-side rather than leaving a
   hole — see DressesService.removeImage. */

/* Mirrors the backend's own cap (AiGenerateDto.ArrayMaxSize) so the admin gets
   told before spending a round-trip on a request that will 400. The number
   comes from the AI provider's 6-concurrent-prediction ceiling — change it in
   both places or not at all. */
const MAX_PER_RUN = 6;

/* Mirrors MAX_GALLERY_IMAGES in dresses.service.ts. The server re-checks it;
   this copy exists so the uploader can refuse a too-large drop up front and
   explain why, instead of firing uploads that the append call will reject. */
const MAX_GALLERY = 8;

export function AdminPhotosPanel({ dress, adminPw, onUpdated, toast }) {
  const [selected, setSelected] = useState([]);
  // Ids currently mid-generation — drives the per-thumbnail spinner. A Set
  // would be tidier but arrays keep the state updates plainly immutable.
  const [busy, setBusy] = useState([]);
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null); // photo pending confirmation
  const [removeBusy, setRemoveBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  // Ids currently mid-download — mirrors `busy`, just for the download action.
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

  /* ── Add ───────────────────────────────────────────────────────────────
     ImageUploader is reused rather than reimplemented — it already owns the
     drag-and-drop, the MIME/size validation and the upload call. It's built
     around a draft `string[]`, so it's driven here with a permanently empty
     array and a setter that intercepts each newly uploaded URL and posts it
     straight to the gallery. `max` is the remaining room, not the total, so
     its own cap logic still refuses an oversized multi-file drop. */
  const appendUploaded = async (updater) => {
    const next = typeof updater === "function" ? updater([]) : updater;
    const urls = next || [];
    if (!urls.length) return;

    setAdding(true);
    try {
      // Sequential, not Promise.all. Each append responds with the whole
      // dress as it stood after that insert; run in parallel, the last
      // response to arrive wins and can be one that was read before a
      // sibling's insert landed — rendering a gallery missing an image that
      // is actually in the database. Awaiting in turn makes the last
      // response the newest by construction.
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

  /* ── Remove ─────────────────────────────────────────────────────────── */
  const confirmRemove = async () => {
    if (removeBusy) return;
    setRemoveBusy(true);
    try {
      const fresh = await adminRemoveDressImage(dress.id, removing.id, adminPw);
      onUpdated(fresh);
      // Drop it from the AI selection too, or the next generate call would
      // send an id the dress no longer has and 400 the whole batch.
      setSelected((p) => p.filter((x) => x !== removing.id));
      setRemoving(null);
      toast("התמונה נמחקה");
    } catch (e) {
      toast("מחיקת התמונה נכשלה: " + e.message);
    } finally {
      setRemoveBusy(false);
    }
  };

  /* ── Download ───────────────────────────────────────────────────────────
     Fetched and saved as a blob rather than a plain `<a href download>` —
     the images live on Supabase Storage's own origin, and browsers ignore
     the `download` attribute on a cross-origin link and just navigate to it
     instead of saving. Fetching the bytes ourselves and handing the browser
     an object URL forces an actual save regardless of origin. */
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

  /* ── Generate ───────────────────────────────────────────────────────── */
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
      // Keep the failures selected so a retry is one click; drop the rest.
      setSelected(batch.filter((id) => failed[id]));

      if (ok > 0) {
        // The endpoint returns per-image statuses, not the dress, so re-read
        // it to pick up the new photos with their ids and ordering.
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
      // Request-level failure (wrong password, dress gone, network) — no
      // per-image detail to show, so surface it once.
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

                {/* Siblings of the thumb button, not children — a button
                    inside a button is invalid and swallows the inner click. */}
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
