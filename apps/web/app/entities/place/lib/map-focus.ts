import { Slug, type BBox, type PlaceCard, type PlaceDetail } from '@ranhduong/contracts';
import { placeMapCard } from './place-story';

/** Navigation state only: never forward this field as a discovery filter. */
export function parseMapFocus(value: unknown): string | undefined {
  const parsed = Slug.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function placeMapHref(city: string, slug: string): string {
  return `/${encodeURIComponent(city)}/ban-do?${new URLSearchParams({ place: slug })}`;
}

export function mapFocusPlace(place: PlaceDetail | null, bounds: BBox): PlaceCard | null {
  if (!place?.location) return null;
  const [lng, lat] = place.location.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < bounds[0] || lng > bounds[2] || lat < bounds[1] || lat > bounds[3]) return null;
  return placeMapCard(place) ?? null;
}
