import { useState } from "react";
import { placeholder } from "../../lib/data.js";
import { COLORS } from "../../constants/theme.js";

export function Img({ src, color, label, className = "", priority = false, ...rest }) {
  const [err, setErr] = useState(false);
  return (
    <img
      {...rest}
      src={err ? placeholder(color || COLORS.brand, label) : src}
      onError={() => setErr(true)}
      alt={label || ""}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      {...(priority ? { fetchpriority: "high" } : null)}
      className={className}
    />
  );
}
