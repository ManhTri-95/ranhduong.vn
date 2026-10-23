import { describe, expect, it } from 'vitest';
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { itineraryFitPadding, itineraryMapData } from './map-data';

function stop(number: number, coordinates?: [number, number]): ItineraryPublicStop {
  return { key: `1-${number}`, number, start: '08:00', end: '09:00', travelMinFromPrev: 0, kind: 'visit', note: '',
    place: coordinates ? { slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: true, location: { type: 'Point', coordinates } } : null };
}
describe('numbered itinerary map data', () => {
  it('fits within short map canvases, reserving visible space above the controls', () => {
    for (const [width, height, overlay] of [[375, 120, 56], [768, 170, 56], [480, 500, 106]] as const) {
      const padding = itineraryFitPadding(width, height, overlay);
      expect(padding.top + padding.bottom).toBeLessThan(height);
      expect(padding.left + padding.right).toBeLessThan(width);
      expect(padding.bottom).toBeGreaterThanOrEqual(padding.top);
      expect(padding.top).toBeGreaterThan(0);
    }
  });
  it('preserves stop numbers and repeat visits, with GeoJSON longitude first', () => {
    const data = itineraryMapData([stop(1, [108.4, 11.9]), stop(2, [108.4, 11.9])]);
    expect(data.points.map(({ key, number, coordinates }) => ({ key, number, coordinates }))).toEqual([
      { key: '1-1', number: 1, coordinates: [108.4, 11.9] }, { key: '1-2', number: 2, coordinates: [108.4, 11.9] },
    ]);
  });
  it('draws ordered segments but never bridges an unavailable stop', () => {
    const data = itineraryMapData([stop(1, [1, 1]), stop(2, [2, 2]), stop(3), stop(4, [4, 4]), stop(5, [5, 5])]);
    expect(data.points.map((point) => point.number)).toEqual([1, 2, 4, 5]);
    expect(data.route.features.map((feature) => feature.geometry.coordinates)).toEqual([[[1, 1], [2, 2]], [[4, 4], [5, 5]]]);
  });
  it('handles an empty day or a day with no coordinates', () => {
    expect(itineraryMapData([]).points).toEqual([]);
    expect(itineraryMapData([stop(1), stop(2)]).route.features).toEqual([]);
  });
});
