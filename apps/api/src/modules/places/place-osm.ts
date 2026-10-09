import { OsmDraft, OsmElement, type BBox } from '@ranhduong/contracts';

export const OSM_AMENITY_PATTERN = '^(cafe|restaurant|fast_food|food_court)$';
export const OSM_TOURISM_PATTERN = '^(attraction|museum|viewpoint|gallery|zoo|theme_park)$';

/** Overpass center is the bounding-box center, so the admin still needs to review the pin. */
export function toOsmDraft(input: unknown, bounds: BBox): OsmDraft | null {
  const parsed = OsmElement.safeParse(input);
  if (!parsed.success) return null;
  const element = parsed.data;
  const point = element.type === 'node' ? { lat: element.lat, lon: element.lon } : element.center;
  if (point?.lat === undefined || point.lon === undefined) return null;
  const [west, south, east, north] = bounds;
  if (point.lon < west || point.lon > east || point.lat < south || point.lat > north) return null;

  const { tags } = element;
  let category: OsmDraft['category'];
  if (tags.amenity === 'cafe') category = 'cafe';
  else if (new RegExp(OSM_AMENITY_PATTERN).test(tags.amenity ?? '')) category = 'food';
  else if (new RegExp(OSM_TOURISM_PATTERN).test(tags.tourism ?? '')) category = 'attraction';
  else return null;

  const street = [tags['addr:housenumber'], tags['addr:street']].map((s) => s?.trim()).filter(Boolean).join(' ');
  const address = tags['addr:full']?.trim() || [street, tags['addr:suburb']?.trim(), tags['addr:city']?.trim()].filter(Boolean).join(', ');
  const draft = OsmDraft.safeParse({
    osmId: `${element.type}/${element.id}`,
    name: tags['name:vi']?.trim() || tags.name?.trim(),
    category,
    location: { type: 'Point', coordinates: [point.lon, point.lat] },
    ...(address ? { address } : {}),
  });
  return draft.success ? draft.data : null;
}
