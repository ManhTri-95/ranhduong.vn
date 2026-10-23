import type { ItineraryPublicStop, LngLat } from '@ranhduong/contracts';

/** Keep usable camera space even in a short landscape canvas with controls. */
export function itineraryFitPadding(width: number, height: number, controlsHeight: number) {
  const horizontal = Math.min(64, width * .15);
  const top = Math.min(64, height * .16);
  return { left: horizontal, right: horizontal, top, bottom: Math.min(height * .55, Math.max(top, controlsHeight + 12)) };
}

export function itineraryMapData(stops: readonly ItineraryPublicStop[]) {
  const points = stops.flatMap((stop) => stop.place?.location ? [{
    key: stop.key, number: stop.number, name: stop.place.name, coordinates: stop.place.location.coordinates,
  }] : []);
  const features: { type: 'Feature'; properties: Record<string, never>; geometry: { type: 'LineString'; coordinates: LngLat[] } }[] = [];
  for (let index = 1; index < stops.length; index++) {
    const from = stops[index - 1]?.place?.location;
    const to = stops[index]?.place?.location;
    if (from && to) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from.coordinates, to.coordinates] } });
  }
  return { points, route: { type: 'FeatureCollection' as const, features } };
}
