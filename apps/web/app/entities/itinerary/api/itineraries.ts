import type { ItineraryCardList } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

/** GET /cities/:city/itineraries/templates: lịch trình mẫu đã công khai, mới tạo trước. */
export function useTemplateList(citySlug: string, limit: number) {
  return useFetch<ItineraryCardList>(`/cities/${citySlug}/itineraries/templates`, {
    baseURL: useApiBase(),
    query: { limit },
    key: `itinerary-templates:${citySlug}:${limit}`,
    timeout: API_TIMEOUT_MS,
  });
}
