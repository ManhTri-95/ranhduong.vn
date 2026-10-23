import { ItineraryUserDetail, type ItineraryRequest } from '@ranhduong/contracts';
import { API_TIMEOUT_MS } from '~/shared/api/client';

/** POST only on explicit client submission; never automatically replay a creation. */
export async function createGuestItinerary(apiBase: string, citySlug: string, input: ItineraryRequest, signal: AbortSignal): Promise<ItineraryUserDetail> {
  const result: unknown = await $fetch(`/cities/${citySlug}/itineraries`, {
    baseURL: apiBase, method: 'POST', body: input, credentials: 'include',
    timeout: API_TIMEOUT_MS, retry: 0, signal,
  });
  return ItineraryUserDetail.parse(result);
}
