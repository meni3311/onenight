import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dressApi } from '../api/dress.api';
import type { AvailabilityResult, DateRange } from '../types/dress.types';

/**
 * Re-checks availability whenever the size or date range changes.
 * Disabled until both a size and a full date range are selected.
 */
export const useAvailability = (
  dressId: string,
  size: string | null,
  dates: DateRange | null,
): UseQueryResult<AvailabilityResult, Error> => {
  return useQuery<AvailabilityResult, Error>({
    queryKey: ['availability', dressId, size, dates],
    queryFn: () =>
      dressApi.checkAvailability({
        dressId,
        size: size as string,
        startDate: (dates as DateRange).startDate,
        endDate: (dates as DateRange).endDate,
      }),
    enabled: Boolean(size) && Boolean(dates),
  });
};
