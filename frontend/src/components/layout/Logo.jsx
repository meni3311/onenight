/* Wordmark + tagline that returns to the home page. */
export function Logo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="onenight — דף הבית"
      className="group flex flex-col items-start leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
    >
      <span className="font-display text-[26px] font-medium tracking-tight text-[#6B2D2D] lowercase italic" dir="ltr">
        onenight
      </span>
      <span className="mt-0.5 font-body text-[11px] font-medium tracking-[0.22em] text-muted">
        השכרת שמלות ערב
      </span>
    </button>
  );
}
