import { COLORS } from "../../constants/theme.js";

/* Heart / wishlist toggle button. `active` drives the filled brand state. */
export function Heart({ active, onClick, label, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label || (active ? "הסרה ממועדפים" : "הוספה למועדפים")}
      aria-pressed={active}
      className={
        "group/heart grid place-items-center rounded-full transition-all duration-200 ease-lux " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
        className
      }
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        className={
          "transition-all duration-200 ease-lux " +
          (active ? "animate-heart-pop" : "group-hover/heart:scale-110")
        }
        fill={active ? COLORS.brand : "rgba(255,255,255,0.25)"}
        stroke={active ? COLORS.brand : "#FFFFFF"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
