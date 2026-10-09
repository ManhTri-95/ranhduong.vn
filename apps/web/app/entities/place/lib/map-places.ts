import { PlaceListResponse, type BBox, type PlaceCard } from '@ranhduong/contracts';

/** Tải trọn vùng, kiểm từng trang trước khi đưa vào GeoJSON. */
export async function loadMapPlaces(fetchPage: (cursor?: string) => Promise<unknown>, signal: AbortSignal): Promise<PlaceCard[]> {
  const places = new Map<string, PlaceCard>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    signal.throwIfAborted();
    const page = PlaceListResponse.parse(await fetchPage(cursor));
    signal.throwIfAborted();
    for (const place of page.items) places.set(place.slug, place);
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error('API returned a repeated cursor');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return [...places.values()];
}

export function placesGeoJson(places: readonly PlaceCard[]) {
  return {
    type: 'FeatureCollection' as const,
    features: places.flatMap((place) => place.location ? [{
      type: 'Feature' as const, id: place.slug,
      geometry: place.location,
      properties: { slug: place.slug, category: place.category },
    }] : []),
  };
}

export function intersectMapBounds(viewport: BBox, city: BBox): BBox | null {
  const bounds: BBox = [Math.max(viewport[0], city[0]), Math.max(viewport[1], city[1]), Math.min(viewport[2], city[2]), Math.min(viewport[3], city[3])];
  return bounds[0] < bounds[2] && bounds[1] < bounds[3] ? bounds : null;
}
