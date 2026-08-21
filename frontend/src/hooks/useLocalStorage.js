import { useEffect, useState } from "react";

/* State that persists to localStorage under `key`. Reads the stored value
   (or `fallback`) on mount and writes back on every change.

   Scope: user *preferences* only — the favourites list ("onenight_favs")
   and the signed-in user ("onenight_user"). Listing data must never go
   through here. Dresses live in Postgres and their photos in Cloudflare R2;
   a browser-local copy is what makes them invisible across sessions and
   devices.

   The read/write helpers are inlined rather than shared, deliberately: a
   general-purpose storage utility sitting next to the dress code is an
   invitation to cache listings in it. */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    // Unavailable (private mode) or corrupt JSON — fall back rather than
    // taking the app down over a cached preference.
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled; preferences just don't persist.
  }
}

export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    write(key, value);
  }, [key, value]);
  return [value, setValue];
}
