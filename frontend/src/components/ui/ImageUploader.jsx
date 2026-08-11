import { useRef, useState } from "react";
import { uploadDressImage } from "../../lib/api.js";

/* Shared image dropzone: click-or-drag upload, thumbnail previews with
   remove + reorder. Used by both the publish form (new listings) and the
   admin review screen (editing images on a pending request), so both talk
   to the same `images: string[]` shape.

   Those strings are public Supabase Storage URLs. They used to be base64
   data URLs produced by FileReader and stashed in localStorage, which meant
   photos existed only in the browser that uploaded them — invisible to
   everyone else. Files now go straight to Storage via the backend and only
   the returned URL is held in state, so whatever is submitted is already
   durable and shareable.

   Uploads happen on selection rather than on form submit: it keeps the
   submit path a plain JSON POST, and the user sees failures while they're
   still looking at the picker instead of after filling the whole form. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function ImageUploader({ images, setImages, max = 3, error, dressId }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef();

  const handleFiles = async (list) => {
    setUploadError("");
    // `images.length` is read once here, but each upload resolves
    // independently — the functional setState below re-checks `max` so a
    // burst of parallel uploads can't overshoot the cap.
    const room = max - images.length;
    if (room <= 0) return;

    const chosen = Array.from(list).slice(0, room);
    const valid = [];
    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type)) {
        setUploadError("ניתן להעלות קבצי JPG, PNG או WEBP בלבד");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploadError("הקובץ גדול מ-10MB");
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;

    setBusy((n) => n + valid.length);
    await Promise.all(
      valid.map(async (file) => {
        try {
          const url = await uploadDressImage(file, dressId);
          setImages((p) => (p.length < max ? [...p, url] : p));
        } catch (e) {
          setUploadError(e.message || "העלאת התמונה נכשלה");
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
  };

  const remove = (i) => setImages((p) => p.filter((_, j) => j !== i));
  const move = (i, dir) => setImages((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const next = [...p];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const full = images.length >= max;
  const label = busy > 0
    ? `מעלה ${busy} תמונות…`
    : full
      ? `הגעת למקסימום (${max} תמונות)`
      : "גררי לכאן תמונות או לחצי לבחירה";

  return (
    <div>
      <div
        className={"dropzone" + (drag ? " drag" : "") + (busy > 0 ? " busy" : "")}
        aria-busy={busy > 0}
        onClick={() => { if (!full && !busy) fileRef.current.click(); }}
        onDragOver={(e) => { e.preventDefault(); if (!full) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!full) handleFiles(e.dataTransfer.files); }}
      >
        {label}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      {(error || uploadError) && <span className="err">{uploadError || error}</span>}
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((src, i) => (
            <div key={src} className="thumb">
              <img src={src} alt="" />
              <button type="button" onClick={() => remove(i)} aria-label="הסרת תמונה">✕</button>
              {images.length > 1 && (
                <div className="thumb-reorder">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="הזזה שמאלה">‹</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="הזזה ימינה">›</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
