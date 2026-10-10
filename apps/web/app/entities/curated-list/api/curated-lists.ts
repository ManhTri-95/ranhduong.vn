import { CuratedListDetail, CuratedListResponse } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

export function useCuratedLists(city: string) {
  return useFetch(`/cities/${city}/curated-lists`, {
    baseURL: useApiBase(), key: `curated-lists:${city}`, timeout: API_TIMEOUT_MS,
    transform: (data: unknown) => CuratedListResponse.parse(data),
  });
}
export function useCuratedList(city: string, slug: string) {
  return useFetch(`/cities/${city}/curated-lists/${slug}`, {
    baseURL: useApiBase(), key: `curated-list:${city}:${slug}`, timeout: API_TIMEOUT_MS,
    transform: (data: unknown) => CuratedListDetail.parse(data),
  });
}
