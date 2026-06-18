import { useEffect, useState } from "react";
import { LS } from "../lib/data.js";

/* State that persists to localStorage under `key`. Reads the stored value
   (or `fallback`) on mount and writes back on every change. Used for the
   favorites list and the signed-in user. */
export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => LS.get(key, fallback));
  useEffect(() => {
    LS.set(key, value);
  }, [key, value]);
  return [value, setValue];
}
