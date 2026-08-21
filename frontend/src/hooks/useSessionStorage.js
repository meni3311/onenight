import { useEffect, useState } from "react";

function read(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export function useSessionStorage(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    write(key, value);
  }, [key, value]);
  return [value, setValue];
}
