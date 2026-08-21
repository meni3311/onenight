import { FONTS } from "../../constants/theme.js";

export function ResetLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ fontFamily: FONTS.jost, fontSize: "12px", color: "rgba(243,233,230,0.6)" }}
      className="underline-offset-2 hover:underline"
    >
      איפוס הכל
    </button>
  );
}
