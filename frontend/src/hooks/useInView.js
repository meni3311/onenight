import { useEffect, useState } from "react";

/* Tracks whether the element with id `targetId` is currently in view.
   Unlike useReveal this updates continuously (enter and leave), so it can
   drive things like a floating control that should only show over a section. */
export function useInView(targetId, options) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      options
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);
  return inView;
}
