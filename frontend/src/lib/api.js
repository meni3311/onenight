
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const withBase = (path) => BASE + path;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
    throw new ApiError("לא ניתן להתחבר לשרת. נסי שוב בעוד רגע.", 0);
  }

  if (!res.ok) throw await readError(res);
  if (res.status === 204) return null;
  return res.json();
}

export function browseDresses(query = "") {
  return api(`/api/dresses${query}`);
}

export function getDress(dressId) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}`);
}

export function getDressesByIds(ids) {
  if (!ids.length) return Promise.resolve([]);
  return api(`/api/dresses/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
}

export function getSimilarDresses(dressId, limit = 6) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}/similar?limit=${limit}`);
}

export function getMyDresses(email) {
  if (!email) return Promise.resolve([]);
  return api(`/api/dresses/mine?email=${encodeURIComponent(email)}`);
}

export function getAdminDresses(status, adminPw, page = 1, category = "") {
  const qs = new URLSearchParams({ status, page: String(page) });
  if (category) qs.set("category", category);
  return api(`/api/admin/dresses?${qs}`, { adminPw });
}

export function getDressInquiryCount(dressId) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}/inquiry-count`);
}

export function deleteDress(dressId, email) {
  return api(`/api/dresses/${encodeURIComponent(dressId)}`, {
    method: "DELETE",
    body: { email },
  });
}

export function adminAddDressImage(dressId, url, adminPw) {
  return api(`/api/admin/dresses/${encodeURIComponent(dressId)}/images`, {
    method: "POST",
    adminPw,
    body: { url },
  });
}

export function adminRemoveDressImage(dressId, imageId, adminPw) {
  return api(
    `/api/admin/dresses/${encodeURIComponent(dressId)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE", adminPw },
  );
}

export function aiGenerateDressPhotos(dressId, imageIds, adminPw) {
  return api(`/api/admin/dresses/${encodeURIComponent(dressId)}/ai-generate`, {
    method: "POST",
    adminPw,
    body: { imageIds },
  });
}

export function submitContactInquiry(payload) {
  return api("/api/contact-inquiries", { method: "POST", body: payload });
}

export function getContactInquiries(adminPw) {
  return api("/api/contact-inquiries", { adminPw });
}

export function setContactInquiryHandled(id, handled, adminPw) {
  return api(`/api/contact-inquiries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    adminPw,
    body: { handled },
  });
}

export function deleteContactInquiry(id, adminPw) {
  return api(`/api/contact-inquiries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    adminPw,
  });
}

export function sendOtp(email) {
  return api("/api/auth/send-otp", { method: "POST", body: { email } });
}

export function deleteAccount(email, code) {
  return api("/api/auth/delete-account", { method: "POST", body: { email, code } });
}

export async function uploadDressImage(file, dressId) {
  const form = new FormData();
  form.append("file", file);

  const qs = dressId ? `?dressId=${encodeURIComponent(dressId)}` : "";
  let res;
  try {
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
