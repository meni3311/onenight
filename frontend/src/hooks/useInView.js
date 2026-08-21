import { useEffect, useState } from "react";

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
