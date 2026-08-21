import { useRef, useState } from "react";
import { uploadDressImage } from "../../lib/api.js";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function ImageUploader({ images, setImages, max = 3, error, dressId }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef();

  const handleFiles = async (list) => {
    setUploadError("");
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
