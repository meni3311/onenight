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
export function Img({
  src,
  photo,
  sizes,
  color,
  label,
  className = "",
  priority = false,
  ...rest
}) {
  const [err, setErr] = useState(false);

  /* `photo` is a ClientDressPhoto when the caller has one — it carries the
     resized variants the backend wrote at upload time. They're null for
     anything uploaded before the resizing pipeline existed, so a srcset is
     only emitted when all three are present; otherwise this behaves exactly
     as it did before and the browser just loads `src`.

     Suppressed entirely once `err` is set, so the fallback placeholder is
     never competing with a stale candidate list. */
  const srcSet =
    !err && photo?.url400 && photo?.url800 && photo?.url1200
      ? `${photo.url400} 400w, ${photo.url800} 800w, ${photo.url1200} 1200w`
      : undefined;

  return (
    <img
      {...rest}
      src={err ? placeholder(color || COLORS.brand, label) : src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
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
