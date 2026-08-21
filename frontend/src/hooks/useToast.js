import { useRef, useState } from "react";

const TOAST_DURATION = 2600;

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
