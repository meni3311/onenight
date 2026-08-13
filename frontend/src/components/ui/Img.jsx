import { useState } from "react";
import { placeholder } from "../../lib/data.js";
import { COLORS } from "../../constants/theme.js";

/* Image with a graceful SVG fallback: on load error it swaps to a tinted
   placeholder generated from the dress color + label.

   `priority` opts an image out of lazy loading. It defaults to false, but
   loading="lazy" used to be hardcoded here for *every* image — including
   the first row of dress cards, which is normally the LCP element. Lazy
   loading those delays the largest paint rather than helping it, so
   above-the-fold callers pass priority. */
export function Img({ src, color, label, className = "", priority = false, ...rest }) {
  const [err, setErr] = useState(false);
  return (
    <img
      {...rest}
      src={err ? placeholder(color || COLORS.brand, label) : src}
      onError={() => setErr(true)}
      alt={label || ""}
      loading={priority ? "eager" : "lazy"}
      /* async lets the decode happen off the main thread; the priority
         images stay sync so they can land in the first paint. */
      decoding={priority ? "sync" : "async"}
      {...(priority ? { fetchpriority: "high" } : null)}
      className={className}
    />
  );
}
