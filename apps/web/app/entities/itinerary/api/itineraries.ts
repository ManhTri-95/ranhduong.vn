import { ItineraryTemplateDetail, type ItineraryCardList } from '@ranhduong/contracts';
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

export function useTemplateDetail(citySlug: string, slug: string) {
  return useFetch<ItineraryTemplateDetail>(`/cities/${citySlug}/itineraries/templates/${slug}`, {
    baseURL: useApiBase(), key: `itinerary-template:${citySlug}:${slug}`, timeout: API_TIMEOUT_MS,
  });
}

/** An optional homepage preview; uses the same public template detail contract and endpoint. */
export async function fetchTemplateDetail(apiBase: string, citySlug: string, slug: string, signal: AbortSignal): Promise<ItineraryTemplateDetail> {
  const data: unknown = await $fetch(`/cities/${citySlug}/itineraries/templates/${slug}`, { baseURL: apiBase, timeout: API_TIMEOUT_MS, signal, retry: 0 });
  return ItineraryTemplateDetail.parse(data);
}
