// TypeScript interfaces mirroring the backend DTOs (NestJS + Prisma).
// Keep these in sync with backend/src/dresses/dto/*.

export type DressSourceValue = 'PERSONAL_TAILOR' | 'BOUTIQUE' | 'STORE';

export type DressConditionValue =
  | 'NEW'
  | 'LIKE_NEW'
  | 'VERY_GOOD'
  | 'GOOD'
  | 'FAIR';

export type DressLengthValue = 'SHORT' | 'MEDIUM' | 'LONG';

export type SleeveLengthValue = 'SHORT' | 'MEDIUM' | 'LONG';

export interface DressSize {
  id: string;
  size: string;
  available: boolean;
}

export interface DressImage {
  id: string;
  url: string;
  order: number;
}

export interface Review {
  id: string;
  reviewer: string;
  rating: number;
  text: string;
  sizeWorn: string;
  createdAt: string;
}

export interface DressDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  fabric: string | null;
  color: string | null;
  designer: string | null;
  source: DressSourceValue;
  condition: DressConditionValue;
  dressLength: DressLengthValue;
  sleeveLength: SleeveLengthValue;
  city: string | null;
  sizes: DressSize[];
  images: DressImage[];
  reviews: Review[];
}

export interface DressSummary {
  id: string;
  name: string;
  price: number;
  images: DressImage[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface UnavailableDateRange {
  start: string;
  end: string;
}

export interface AvailabilityResult {
  available: boolean;
}

/** Params accepted by the availability check endpoint. */
export interface CheckAvailabilityParams extends DateRange {
  dressId: string;
  size: string;
}
