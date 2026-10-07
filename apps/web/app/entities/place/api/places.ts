import type { PlaceListResponse } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

/** Query của GET /cities/:city/places; category là chuỗi các danh mục cách nhau bằng dấu phẩy. */
export interface PlaceListParams {
  q?: string;
  category?: string;
  limit?: number;
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
