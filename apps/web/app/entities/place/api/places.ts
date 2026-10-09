import { PlaceDetailResponse, PlaceListResponse, type PlaceCard } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

/** Query của GET /cities/:city/places; category, tags là chuỗi cách nhau bằng dấu phẩy. */
export interface PlaceListParams {
  q?: string;
  category?: string;
  zone?: string;
  tags?: string;
  cursor?: string;
  limit?: number;
  bbox?: string;
  near?: string;
  radius?: number;
}

/** GET /cities/:city/places. `immediate: false` khi chưa cần gọi (trang tìm kiếm chưa có từ khoá). */
export function usePlaceList(citySlug: string, params: PlaceListParams, key: string, immediate = true) {
  return useFetch<PlaceListResponse>(`/cities/${citySlug}/places`, {
    baseURL: useApiBase(),
    query: params,
    key,
    immediate,
    timeout: API_TIMEOUT_MS,
  });
}

/** Tải một trang trên trình duyệt (nút "Xem thêm"); apiBase lấy bằng useApiBase() lúc setup của component. */
export function fetchPlacePage(apiBase: string, citySlug: string, params: PlaceListParams): Promise<PlaceListResponse> {
  return $fetch<PlaceListResponse>(`/cities/${citySlug}/places`, { baseURL: apiBase, query: params, timeout: API_TIMEOUT_MS });
}

export async function fetchPlaceSuggestions(apiBase: string, citySlug: string, q: string, signal: AbortSignal): Promise<PlaceCard[]> {
  const data: unknown = await $fetch(`/cities/${citySlug}/places`, {
    baseURL: apiBase, query: { q, limit: 6 }, timeout: API_TIMEOUT_MS, signal, retry: 0,
  });
  return PlaceListResponse.parse(data).items;
}

export function usePlaceDetail(citySlug: string, slug: string) {
  return useFetch(`/cities/${citySlug}/places/${slug}`, {
    baseURL: useApiBase(), key: `place-detail:${citySlug}:${slug}`,
    timeout: API_TIMEOUT_MS, transform: (data: unknown) => PlaceDetailResponse.parse(data),
  });
}
