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
   /api → http://localhost:3000. In production (frontend on Vercel, backend
   on Render — different origins) set VITE_API_BASE_URL to the deployed API
   origin, e.g. https://onenight-api.onrender.com — see .env.example. */
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/* Callers pass the full "/api/..." path, matching the backend's global
   prefix (see backend/src/main.ts). Exported so every other place in the
   app that talks to the backend with a raw fetch() — AuthContext's OTP
   calls, AdminPage's booking-inquiries calls, ProductPage's inquiry log —
   goes through this same BASE instead of assuming same-origin, which only
   holds locally behind the Vite proxy. */
export const withBase = (path) => BASE + path;

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
 * How many booking inquiries reference this dress. Read before showing the
 * owner's delete confirmation, so the dialog can warn that deleting the
 * listing leaves those requests behind.
 */
export function getDressInquiryCount(dressId) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}/inquiry-count`);
}

/**
 * Owner deletes their own listing, its photos, and its stored image files.
 *
 * `email` is the ownership proof — this app has no bearer token, so the
 * backend matches it against the listing's own email (see
 * DressesService.deleteDress). Resolves with nothing on success; throws
 * ApiError(403) if the email doesn't match the listing.
 */
export function deleteDress(dressId, email) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}`, {
    method: "DELETE",
    body: { email },
  });
}

/** Admin: append an already-uploaded photo URL to a dress's gallery. */
export function adminAddDressImage(dressId, url, adminPw) {
  return api(`/api/admin/dresses/${encodeURIComponent(dressId)}/images`, {
    method: "POST",
    adminPw,
    body: { url },
  });
}

/**
 * Admin: remove one photo from a dress's gallery and from storage.
 * Rejects with ApiError(400) when it's the listing's last photo.
 * Both admin image calls resolve with the updated dress.
 */
export function adminRemoveDressImage(dressId, imageId, adminPw) {
  return api(
    `/api/admin/dresses/${encodeURIComponent(dressId)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE", adminPw },
  );
}

/**
 * Admin-only: turn selected listing photos into AI on-model photos.
 *
 * Resolves with one entry per requested image —
 * `{ sourceImageId, generatedImageUrl, status, error? }` — and a mix of
 * successes and errors is a normal outcome, not a thrown one. It only rejects
 * if the request itself failed (bad password, unknown dress, network).
 *
 * Slower than every other call in this file: it's one metered generation per
 * image, run concurrently server-side but still ~10s each. Callers should show
 * per-thumbnail progress rather than a blocking spinner.
 */
export function aiGenerateDressPhotos(dressId, imageIds, adminPw) {
  return api(`/api/admin/dresses/${encodeURIComponent(dressId)}/ai-generate`, {
    method: "POST",
    adminPw,
    body: { imageIds },
  });
}

/**
 * Sends a 6-digit email OTP. Shared by registration, forgot-password, and
 * account deletion — one code system, keyed only by email, no "purpose"
 * field — so this is the same call AuthContext's own postJson makes for
 * those flows, just going through the shared `api()` helper instead.
 */
export function sendOtp(email) {
  return api("/api/auth/send-otp", { method: "POST", body: { email } });
}

/**
 * Self-service account deletion: verifies the OTP and removes the account,
 * its listings, and their images in one call (see UsersController /
 * UsersService.deleteAccount on the backend). Booking inquiries the user
 * sent are deliberately left behind as anonymized snapshots — see the
 * backend for why.
 */
export function deleteAccount(email, code) {
  return api("/api/auth/delete-account", { method: "POST", body: { email, code } });
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
