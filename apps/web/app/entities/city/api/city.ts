import type { CityPublic } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

/** GET /cities/:city. Key cố định để trang chủ và trang tìm kiếm dùng chung dữ liệu đã tải khi SSR. */
export function useCity(citySlug: string) {
  return useFetch<CityPublic>(`/cities/${citySlug}`, { baseURL: useApiBase(), key: `city:${citySlug}`, timeout: API_TIMEOUT_MS });
}
