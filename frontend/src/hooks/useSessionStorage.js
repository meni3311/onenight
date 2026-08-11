import { useEffect, useState } from "react";

/* State that persists to sessionStorage under `key` — same contract as
   useLocalStorage, different lifetime: sessionStorage is scoped to the tab
   and cleared when it closes.

   That difference is the entire reason this exists. Its one caller is the
   admin moderation screen, whose "session" is literally the shared admin
   password (there is no token — AdminGuard compares the password on every
   request, see admin.guard.ts). Persisting it is what makes the screen
   survive a refresh; persisting it in *localStorage* would leave that
   password sitting on disk indefinitely, readable by any later visitor to
   the same browser profile. sessionStorage fixes the refresh bug without
   extending the credential's life beyond the tab it was typed into.

   Same scope rule as useLocalStorage otherwise: preferences and session
   state only. Listing data belongs in Postgres. */

function read(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    // Unavailable (private mode) or corrupt JSON — fall back rather than
    // taking the app down. Admin just logs in again.
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled; the session just doesn't persist.
  }
}

export function useSessionStorage(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    write(key, value);
  }, [key, value]);
  return [value, setValue];
}
