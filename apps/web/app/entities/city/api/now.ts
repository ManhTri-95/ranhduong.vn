import { CityNow } from '@ranhduong/contracts';
import { API_TIMEOUT_MS, useApiBase } from '~/shared/api/client';

export function useCityNow(citySlug: string) {
  return useFetch(`/cities/${citySlug}/now`, {
    baseURL: useApiBase(), key: `city-now:${citySlug}`, timeout: API_TIMEOUT_MS,
    cache: 'no-cache', transform: (data: unknown) => CityNow.parse(data),
  });
}
