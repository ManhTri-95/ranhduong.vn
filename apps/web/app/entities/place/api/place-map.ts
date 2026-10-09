import type { BBox, PlaceCard, PlaceCategory } from '@ranhduong/contracts';
import { API_TIMEOUT_MS } from '~/shared/api/client';
import { loadMapPlaces } from '../lib/map-places';

export function fetchMapPlaces(apiBase: string, city: string, bbox: BBox, category: PlaceCategory | undefined, signal: AbortSignal): Promise<PlaceCard[]> {
  return loadMapPlaces((cursor) => $fetch(`/cities/${city}/places`, {
    baseURL: apiBase, query: { bbox: bbox.join(','), category, cursor, limit: 50 },
    timeout: API_TIMEOUT_MS, signal, retry: 0,
  }), signal);
}
