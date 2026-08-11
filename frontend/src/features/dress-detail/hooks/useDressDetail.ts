import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dressApi } from '../api/dress.api';
import type { DressDetail } from '../types/dress.types';

const FIVE_MINUTES = 1000 * 60 * 5;

/** Fetches a single dress's full detail. */
export const useDressDetail = (
  id: string,
): UseQueryResult<DressDetail, Error> => {
  return useQuery<DressDetail, Error>({
    queryKey: ['dress', id],
    queryFn: () => dressApi.getDressById(id),
    staleTime: FIVE_MINUTES,
    enabled: id.length > 0,
  });
};
