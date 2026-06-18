import { useEffect } from "react";

/* Locks page scroll (body overflow:hidden) while `locked` is true,
   restoring the previous value on unlock / unmount. Used by the mobile
   menu, filter modal and detail modal. */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
