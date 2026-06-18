import { useState } from "react";
import { placeholder } from "../../lib/data.js";
import { COLORS } from "../../constants/theme.js";

/* Image with a graceful SVG fallback: on load error it swaps to a tinted
   placeholder generated from the dress color + label. */
export function Img({ src, color, label, className = "", ...rest }) {
  const [err, setErr] = useState(false);
  return (
    <img
      {...rest}
      src={err ? placeholder(color || COLORS.brand, label) : src}
      onError={() => setErr(true)}
      alt={label || ""}
      loading="lazy"
      className={className}
    />
  );
}
