import { PlaceListResponse, type BBox, type PlaceCard } from '@ranhduong/contracts';
import { pointBounds } from '~/shared/lib/map-camera';
import { areaApiParams, type AreaFilter } from '../lib/area-guide';
import { fetchPlacePage } from './places';

/** Regular cards omit location. Fetch four real geographic matches only after intent. */
export async function fetchAreaPreview(apiBase: string, city: string, zone: string, bounds: BBox, filter: AreaFilter, signal: AbortSignal): Promise<PlaceCard[]> {
  const page = PlaceListResponse.parse(await fetchPlacePage(apiBase, city, { ...areaApiParams(zone, filter), cursor: undefined, bbox: bounds.join(','), limit: 4 }, signal));
  return page.items.filter(place => place.location && pointBounds([place.location.coordinates], bounds)).slice(0, 4);
}
