import { useEffect, useRef, useState } from "react";

/* Reveal-on-scroll: attaches an IntersectionObserver to the returned ref
   and flips `shown` to true once (fire-once) when it enters the viewport. */
export function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, shown];
}
