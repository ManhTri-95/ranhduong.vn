import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { PlaceCard } from '@ranhduong/contracts';
import { placesGeoJson } from '~/entities/place/lib/map-places';

export const PLACE_SOURCE = 'rd-places';
export const CLUSTERS = 'rd-clusters';
export const POINTS = 'rd-points';

export function selectPlaceLayer(map: MapLibreMap, selectedSlug: string | null): void {
  const filter: FilterSpecification = ['!', ['has', 'point_count']];
  // Keep the selected place in the cluster source; only hide its duplicate symbol.
  map.setFilter(POINTS, selectedSlug ? ['all', filter, ['!=', ['get', 'slug'], selectedSlug]] : filter);
}

export function addPlaceLayers(map: MapLibreMap, places: PlaceCard[], element: HTMLElement): void {
  const tokens = getComputedStyle(element);
  const ink = tokens.getPropertyValue('--ink').trim();
  const paper = tokens.getPropertyValue('--paper-raised').trim();
  // Runtime style overrides may have their own sprite. Add our namespace alongside it.
  if (!map.getSprite().some((sprite) => sprite.id === 'rd-pins')) {
    map.addSprite('rd-pins', new URL('/maps/notebook/sprite', window.location.href).href);
  }
  map.addSource(PLACE_SOURCE, { type: 'geojson', data: placesGeoJson(places), cluster: true, clusterMaxZoom: 16, clusterRadius: 45 });
  map.addLayer({ id: CLUSTERS, type: 'circle', source: PLACE_SOURCE, filter: ['has', 'point_count'], paint: {
    'circle-color': paper, 'circle-stroke-color': ink, 'circle-stroke-width': 2,
    'circle-radius': ['step', ['get', 'point_count'], 20, 20, 24, 50, 28],
  } });
  map.addLayer({ id: 'rd-cluster-count', type: 'symbol', source: PLACE_SOURCE, filter: ['has', 'point_count'], layout: {
    'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 14,
    'text-allow-overlap': true,
  }, paint: { 'text-color': ink } });
  map.addLayer({ id: POINTS, type: 'symbol', source: PLACE_SOURCE, filter: ['!', ['has', 'point_count']], layout: {
    'icon-image': ['concat', 'rd-pins:pin-', ['get', 'category']],
    'icon-anchor': 'bottom', 'icon-offset': [0, 2], 'icon-size': 1,
    'icon-allow-overlap': true, 'icon-ignore-placement': true,
  } });
}

export function updatePlaceLayers(map: MapLibreMap, places: PlaceCard[], selectedSlug: string | null): void {
  (map.getSource(PLACE_SOURCE) as GeoJSONSource | undefined)?.setData(placesGeoJson(places));
  if (map.getLayer(POINTS)) selectPlaceLayer(map, selectedSlug);
}
