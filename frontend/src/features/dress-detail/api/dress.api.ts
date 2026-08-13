// All HTTP calls for the dress-detail feature, typed against the shared
// interfaces. Every call surfaces a typed Error on failure.
import type {
  AvailabilityResult,
  CheckAvailabilityParams,
  DressDetail,
  DressSummary,
  UnavailableDateRange,
} from '../types/dress.types';

// Same env var as lib/api.js's withBase() — one name for the backend's
// origin across the whole app, not a second one just for this module.
const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const dressApi = {
  getDressById(id: string): Promise<DressDetail> {
    return request<DressDetail>(`/dresses/${id}`);
  },

  getUnavailableDates(id: string): Promise<UnavailableDateRange[]> {
    return request<UnavailableDateRange[]>(`/dresses/${id}/unavailable-dates`);
  },

  checkAvailability(
    params: CheckAvailabilityParams,
  ): Promise<AvailabilityResult> {
    const { dressId, size, startDate, endDate } = params;
    return request<AvailabilityResult>(
      `/dresses/${dressId}/check-availability`,
      {
        method: 'POST',
        body: JSON.stringify({ size, startDate, endDate }),
      },
    );
  },

  getSimilarDresses(id: string, limit = 4): Promise<DressSummary[]> {
    return request<DressSummary[]>(`/dresses/${id}/similar?limit=${limit}`);
  },
};
