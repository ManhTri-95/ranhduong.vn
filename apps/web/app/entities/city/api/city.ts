import type { CityPublic } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';
import { useCityTheme } from '../lib/use-city-theme';
import { useCityNow } from './now';

/** GET /cities/:city. Key cố định để trang chủ và trang tìm kiếm dùng chung dữ liệu đã tải khi SSR. */
export async function useCity(citySlug: string) {
  const city = useFetch<CityPublic>(`/cities/${citySlug}`, { baseURL: useApiBase(), key: `city:${citySlug}`, timeout: API_TIMEOUT_MS });
  const now = useCityNow(citySlug);
  const theme = useCityTheme(citySlug, city.data, now);
  const [loadedCity, loadedNow] = await Promise.all([city, now]);
  return { ...loadedCity, now: loadedNow, currentNow: theme.current };
}
