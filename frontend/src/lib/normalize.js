
import { SIZES } from "./data.js";

export const MAX_SIZES = 12;
export const MAX_HASHTAGS = 15;
export const MAX_HASHTAG_LENGTH = 30;

const STANDARD_BY_FOLD = new Map(SIZES.map((s) => [s.toLocaleLowerCase(), s]));

export function normalizeSize(raw) {
  const cleaned = String(raw || "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return STANDARD_BY_FOLD.get(cleaned.toLocaleLowerCase()) || cleaned;
}

export function normalizeSizes(raw) {
  const out = [];
  const seen = new Set();
  for (const entry of raw || []) {
    const size = normalizeSize(entry);
    if (!size) continue;
    const key = size.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(size);
  }
  return out;
}

export function normalizeHashtag(raw) {
  let tag = String(raw || "").trim().replace(/^#+/, "");
  tag = tag.replace(/[,\s]+/g, "-").replace(/^-+|-+$/g, "");
  if (!tag) return "";
  return tag.toLocaleLowerCase().slice(0, MAX_HASHTAG_LENGTH).replace(/-+$/, "");
}

export function normalizeHashtags(raw) {
  const out = [];
  const seen = new Set();
  for (const entry of raw || []) {
    const tag = normalizeHashtag(entry);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_HASHTAGS) break;
  }
  return out;
}
