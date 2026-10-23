import type { PlaceCard } from '@ranhduong/contracts';

/** Geography augments the saved collection; it never changes its order or editorial content. */
export function collectionMapPlaces(collection: readonly PlaceCard[], geographic: readonly PlaceCard[]): PlaceCard[] {
  const locations = new Map(geographic.filter(place => place.location).map(place => [place.slug, place.location]));
  return collection.map(place => ({ ...place, location: place.location ?? locations.get(place.slug) }));
}
