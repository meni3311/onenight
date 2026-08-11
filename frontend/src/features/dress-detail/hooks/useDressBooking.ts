import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from '../types/dress.types';

export interface DressBookingState {
  selectedSize: string | null;
  selectedDates: DateRange | null;
  setSelectedSize: (size: string | null) => void;
  setSelectedDates: (dates: DateRange | null) => void;
  /** True once both a size and a complete date range are chosen. */
  isReady: boolean;
  reset: () => void;
}

/**
 * Single source of truth for the booking selection (size + dates).
 * Lives at the page level and is passed down to the relevant sections,
 * keeping prop drilling shallow.
 */
export const useDressBooking = (): DressBookingState => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<DateRange | null>(null);

  const reset = useCallback(() => {
    setSelectedSize(null);
    setSelectedDates(null);
  }, []);

  const isReady = useMemo(
    () => Boolean(selectedSize) && Boolean(selectedDates),
    [selectedSize, selectedDates],
  );

  return {
    selectedSize,
    selectedDates,
    setSelectedSize,
    setSelectedDates,
    isReady,
    reset,
  };
};
