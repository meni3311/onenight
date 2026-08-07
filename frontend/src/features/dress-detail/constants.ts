// Centralised label maps — no magic strings in components.
import type {
  DressConditionValue,
  DressSourceValue,
} from './types/dress.types';

export const CONDITION_LABELS: Record<DressConditionValue, string> = {
  NEW: 'חדשה',
  LIKE_NEW: 'כמו חדשה',
  VERY_GOOD: 'טובה מאוד',
  GOOD: 'טובה',
  FAIR: 'סבירה',
};

export const SOURCE_LABELS: Record<DressSourceValue, string> = {
  PERSONAL_TAILOR: 'תפירה אישית',
  BOUTIQUE: 'בוטיק',
  STORE: 'חנות',
};

/** Canonical size order shown in the selector. */
export const SIZE_ORDER: readonly string[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
];

export const MAX_RATING = 5;

export const HE_MONTHS: readonly string[] = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export const HE_WEEKDAYS: readonly string[] = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
