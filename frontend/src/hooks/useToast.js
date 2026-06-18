import { useRef, useState } from "react";

const TOAST_DURATION = 2600;

/* Transient toast message. Returns the current message and a `toast(msg)`
   trigger that auto-dismisses after TOAST_DURATION. */
export function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);
  const toast = (msg) => {
    setMessage(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_DURATION);
  };
  return [message, toast];
}
