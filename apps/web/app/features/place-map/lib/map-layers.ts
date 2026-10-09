import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { PlaceCard } from '@ranhduong/contracts';
import { placesGeoJson } from '~/entities/place/lib/map-places';

export const PLACE_SOURCE = 'rd-places';
export const CLUSTERS = 'rd-clusters';
export const POINTS = 'rd-points';

export function addPlaceLayers(map: MapLibreMap, places: PlaceCard[], element: HTMLElement): void {
  const tokens = getComputedStyle(element);
  const ink = tokens.getPropertyValue('--ink').trim();
  const paper = tokens.getPropertyValue('--paper-raised').trim();
  const accent = tokens.getPropertyValue('--accent').trim();
  map.addSource(PLACE_SOURCE, { type: 'geojson', data: placesGeoJson(places), cluster: true, clusterMaxZoom: 16, clusterRadius: 45 });
  map.addLayer({ id: CLUSTERS, type: 'circle', source: PLACE_SOURCE, filter: ['has', 'point_count'], paint: {
    'circle-color': paper, 'circle-stroke-color': ink, 'circle-stroke-width': 2,
    'circle-radius': ['step', ['get', 'point_count'], 20, 20, 24, 50, 28],
  } });
  map.addLayer({ id: 'rd-cluster-count', type: 'symbol', source: PLACE_SOURCE, filter: ['has', 'point_count'], layout: {
    'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 14,
    'text-allow-overlap': true,
  }, paint: { 'text-color': ink } });
  map.addLayer({ id: POINTS, type: 'circle', source: PLACE_SOURCE, filter: ['!', ['has', 'point_count']], paint: {
    'circle-color': paper, 'circle-radius': 14, 'circle-stroke-color': ink, 'circle-stroke-width': 2,
  } });
  map.addLayer({ id: 'rd-point-label', type: 'symbol', source: PLACE_SOURCE, filter: ['!', ['has', 'point_count']], layout: {
    'text-field': ['match', ['get', 'category'], 'cafe', 'C', 'food', 'Ă', 'attraction', 'T', 'activity', 'H', 'stay', 'N', 'M'],
    'text-font': ['Noto Sans Regular'], 'text-size': 13, 'text-allow-overlap': true,
  }, paint: { 'text-color': ink } });
  map.addLayer({ id: 'rd-selected', type: 'circle', source: PLACE_SOURCE, filter: ['==', ['get', 'slug'], ''], paint: {
    'circle-color': accent, 'circle-radius': 18, 'circle-stroke-color': ink, 'circle-stroke-width': 3,
  } }, 'rd-point-label');
}

export function updatePlaceLayers(map: MapLibreMap, places: PlaceCard[], selectedSlug: string | null): void {
  (map.getSource(PLACE_SOURCE) as GeoJSONSource | undefined)?.setData(placesGeoJson(places));
  if (map.getLayer('rd-selected')) map.setFilter('rd-selected', ['==', ['get', 'slug'], selectedSlug ?? '']);
}
