/* ============================================================
   HTTP client for the NestJS backend.

   This file used to be a localStorage-backed mock. It isn't any more:
   every dress read and write goes to real Postgres (via Prisma) and
   every photo lives in Supabase Storage. Nothing in the dress flow
   touches browser storage — that's what made listings invisible from
   any other browser.

   Do not reintroduce a local fallback here. A mock that silently takes
   over when the API is down looks like it works and loses data.
   ============================================================ */

/* Dev goes through Vite's proxy (see vite.config.js), which forwards
   /api → http://localhost:3000. In production set VITE_API_BASE_URL to
   the deployed API origin. */
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/* Callers pass the full "/api/..." path, matching the backend controllers
   (which carry the api/ prefix themselves — there's no global prefix). */
const withBase = (path) => BASE + path;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* Nest's exception filter returns { message, error, statusCode }, where
   `message` is a string for most throws but an array of strings for
   ValidationPipe failures. Flatten both into one readable line. */
async function readError(res) {
  let payload;
  try {
    payload = await res.json();
  } catch {
    return new ApiError(`שגיאת שרת (${res.status})`, res.status);
  }
  const m = payload?.message;
  const text = Array.isArray(m) ? m.join(", ") : m || payload?.error;
  return new ApiError(text || `שגיאת שרת (${res.status})`, res.status);
}

/**
 * @param {string} path    e.g. "/api/dresses?status=all"
 * @param {object} [opts]
 * @param {string} [opts.method]
 * @param {object} [opts.body]     JSON-serialized
 * @param {string} [opts.adminPw]  sent as the x-admin-password header
 */
export async function api(path, { method = "GET", body, adminPw } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (adminPw) headers["x-admin-password"] = adminPw;

  let res;
  try {
    res = await fetch(withBase(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (server down, DNS, CORS preflight refused).
    throw new ApiError("לא ניתן להתחבר לשרת. נסי שוב בעוד רגע.", 0);
  }

  if (!res.ok) throw await readError(res);
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Upload one listing photo and get back its public Supabase Storage URL.
 * Sent as multipart rather than JSON — the bytes never pass through the
 * dress record, only the resulting URL does.
 */
export async function uploadDressImage(file, dressId) {
  const form = new FormData();
  form.append("file", file);

  const qs = dressId ? `?dressId=${encodeURIComponent(dressId)}` : "";
  let res;
  try {
    // No Content-Type header: the browser sets the multipart boundary.
    res = await fetch(withBase("/api/dresses/images" + qs), {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError("לא ניתן להתחבר לשרת. נסי שוב בעוד רגע.", 0);
  }

  if (!res.ok) throw await readError(res);
  const { url } = await res.json();
  return url;
}
