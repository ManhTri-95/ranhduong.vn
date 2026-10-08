import { CityPublic, ZoneSuggestResponse, type LngLat } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

/** Thông tin công khai của thành phố: tâm, khung bản đồ, các cụm. */
export async function fetchCity(slug: string): Promise<CityPublic> {
  return CityPublic.parse(await api(`/cities/${slug}`));
}

/** Cụm gợi ý cho điểm ghim. */
export async function fetchZoneSuggestions(city: string, [lng, lat]: LngLat): Promise<ZoneSuggestResponse['zones']> {
  return ZoneSuggestResponse.parse(await api(`/admin/cities/${city}/zones/suggest`, { query: { lng, lat } })).zones;
}
