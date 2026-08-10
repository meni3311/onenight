import { useRef, useState } from "react";

/* Shared image dropzone: click-or-drag upload (FileReader -> dataURL),
   thumbnail previews with remove + reorder. Used by both the publish form
   (new listings) and the admin review screen (editing images on a pending
   request) so both talk to the same `images: string[]` shape and the same
   upload path — no separate storage integration exists in this app yet, so
   this *is* "the existing image upload/storage mechanism". */
export function ImageUploader({ images, setImages, max = 3, error }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const handleFiles = (list) => {
    const arr = Array.from(list).slice(0, max - images.length);
    arr.forEach((file) => {
      const r = new FileReader();
      r.onload = (e) => setImages((p) => (p.length < max ? [...p, e.target.result] : p));
      r.readAsDataURL(file);
    });
  };
  const remove = (i) => setImages((p) => p.filter((_, j) => j !== i));
  const move = (i, dir) => setImages((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const next = [...p];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div>
      <div
        className={"dropzone" + (drag ? " drag" : "")}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        {images.length < max ? "גררי לכאן תמונות או לחצי לבחירה" : `הגעת למקסימום (${max} תמונות)`}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {error && <span className="err">{error}</span>}
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((src, i) => (
            <div key={i} className="thumb">
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
