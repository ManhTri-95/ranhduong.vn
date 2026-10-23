import { PlaceListResponse, type BBox, type PlaceCard } from '@ranhduong/contracts';
import { API_TIMEOUT_MS } from '~/shared/api/client';
import { loadMapPlaces } from '../lib/map-places';
import { mapFilterQuery, type MapFilters } from '../lib/map-query';

export async function fetchMapPlaces(apiBase: string, city: string, bbox: BBox, filters: MapFilters, signal: AbortSignal): Promise<{ places: PlaceCard[]; tags: PlaceListResponse['tags'] }> {
  let tags: PlaceListResponse['tags'] = [];
  const places = await loadMapPlaces(async cursor => {
    const page = PlaceListResponse.parse(await $fetch(`/cities/${city}/places`, {
      baseURL: apiBase, query: { ...mapFilterQuery(filters.category, filters.rainSafe, filters), bbox: bbox.join(','), cursor, limit: 50 },
      timeout: API_TIMEOUT_MS, signal, retry: 0,
    }));
    tags = page.tags;
    return page;
  }, signal);
  return { places, tags };
}
