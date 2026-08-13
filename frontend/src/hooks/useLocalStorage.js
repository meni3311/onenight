import { useEffect, useState } from "react";

/* State that persists to localStorage under `key`. Reads the stored value
   (or `fallback`) on mount and writes back on every change.

   Scope: user *preferences* only — the favourites list ("onenight_favs")
   and the signed-in user ("onenight_user"). Listing data must never go
   through here. Dresses and their photos live in Postgres and Supabase
   Storage; a browser-local copy is what made them invisible across
   sessions and devices in the first place.

   The read/write helpers used to be a shared `LS` object in lib/data.js.
   They're inlined here now that this is the only legitimate caller — a
   general-purpose storage utility sitting next to the dress code is an
   invitation to cache listings in it again. */

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
