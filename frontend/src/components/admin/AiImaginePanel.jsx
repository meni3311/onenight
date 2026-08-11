import { useState } from "react";
import { api, aiGenerateDressPhotos } from "../../lib/api.js";

/* Admin-only AI product photography. Pick one or more of a listing's photos,
   send each through the AI model, and get back clean photos of the dress worn
   by a person.

   Why this is a panel of its own rather than checkboxes bolted onto the
   existing "עריכת תמונות" ImageUploader: that component owns upload, delete
   and reorder of a *draft* array that only hits the server on save. This one
   writes immediately and irreversibly (each click costs a real API call), and
   it needs image ids, which the uploader's flat `string[]` doesn't carry.
   Keeping them apart means the lister-facing upload flow is untouched.

   The two result placements are the backend's call, not this component's —
   see DressesService.generateAiPhotos. Restated here only because the button
   label has to tell the admin which one they're about to get. */

/* Mirrors the backend's own cap (AiGenerateDto.ArrayMaxSize) so the admin gets
   told before spending a round-trip on a request that will 400. The number
   comes from the AI provider's 6-concurrent-prediction ceiling — change it in
   both places or not at all. */
const MAX_PER_RUN = 6;

export function AiImaginePanel({ dress, adminPw, onUpdated, toast }) {
  const [selected, setSelected] = useState([]);
  // Ids currently mid-generation — drives the per-thumbnail spinner. A Set
  // would be tidier but arrays keep the state updates plainly immutable.
  const [busy, setBusy] = useState([]);
  const [errors, setErrors] = useState({});

  const photos = dress.photos || [];
  const running = busy.length > 0;

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

  if (!photos.length) {
    return <div className="ai-panel"><p className="card-meta">אין תמונות ליצירה.</p></div>;
  }

  const label = running
    ? `יוצרת ${busy.length} תמונות…`
    : selected.length === 1
      ? "✨ AI Imagine — תחליף לתמונה הראשית"
      : `✨ AI Imagine — הוספת ${selected.length} תמונות לגלריה`;

  return (
    <div className="ai-panel">
      <p className="card-meta">
        בחרי תמונות ליצירת צילום על דוגמנית. תמונה אחת — תחליף את התמונה הראשית.
        יותר מאחת — יתווספו לגלריה.
      </p>

      <div className="thumbs">
        {photos.map((photo) => {
          const isSelected = selected.includes(photo.id);
          const isBusy = busy.includes(photo.id);
          const error = errors[photo.id];
          return (
            <div key={photo.id} className="ai-thumb-wrap">
              <button
                type="button"
                className={
                  "ai-thumb" +
                  (isSelected ? " on" : "") +
                  (error ? " failed" : "")
                }
                onClick={() => toggle(photo.id)}
                disabled={running}
                aria-pressed={isSelected}
                aria-label={
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
              {error && <span className="err ai-thumb-err">{error}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          className="btn btn-rose"
          onClick={generate}
          disabled={!selected.length || running}
        >
          {label}
        </button>
        {selected.length > 0 && !running && (
          <button className="btn btn-ghost" onClick={() => setSelected([])}>
            ניקוי בחירה
          </button>
        )}
      </div>
    </div>
  );
}
