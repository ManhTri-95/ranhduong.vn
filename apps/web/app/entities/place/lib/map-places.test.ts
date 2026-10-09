import { describe, expect, it } from 'vitest';
import type { PlaceCard } from '@ranhduong/contracts';
import { intersectMapBounds, loadMapPlaces, placesGeoJson } from './map-places';

const fakePlace = (index: number): PlaceCard => ({
  slug: `gia-lap-${index}`, name: `Quán Giả Lập ${index}`, category: 'cafe', openingHours: [], unconfirmed: true,
  location: { type: 'Point', coordinates: [0.2, 0.3] },
});
describe('S12 viewport places', () => {
  it('loads all cursor pages, including more than fifty points, and deduplicates slugs', async () => {
    const calls: (string | undefined)[] = [];
    const places = await loadMapPlaces(async (cursor) => {
      calls.push(cursor);
      return cursor ? { items: [fakePlace(49), fakePlace(50)], tags: [] } : { items: Array.from({ length: 50 }, (_, i) => fakePlace(i)), nextCursor: 'page-2', tags: [] };
    }, new AbortController().signal);
    expect(places).toHaveLength(51);
    expect(calls).toEqual([undefined, 'page-2']);
  });
  it('rejects repeated cursors rather than looping forever', async () => {
    await expect(loadMapPlaces(async () => ({ items: [fakePlace(1)], tags: [], nextCursor: 'same' }), new AbortController().signal)).rejects.toThrow('cursor');
  });
  it('does not fetch another page after cancellation', async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(loadMapPlaces(async () => {
      calls++;
      controller.abort();
      return { items: [fakePlace(1)], tags: [], nextCursor: 'next' };
    }, controller.signal)).rejects.toThrow();
    expect(calls).toBe(1);
  });
  it('rejects invalid API data before drawing markers', async () => {
    await expect(loadMapPlaces(async () => ({ items: [{ ...fakePlace(1), location: { type: 'Point', coordinates: [0, 100] } }], tags: [] }), new AbortController().signal)).rejects.toThrow();
  });
  it('creates point features with slug/category only and skips missing positions', () => {
    const withoutLocation = { ...fakePlace(2), location: undefined };
    expect(placesGeoJson([fakePlace(1), withoutLocation])).toEqual({ type: 'FeatureCollection', features: [{
      type: 'Feature', id: 'gia-lap-1', geometry: { type: 'Point', coordinates: [0.2, 0.3] }, properties: { slug: 'gia-lap-1', category: 'cafe' },
    }] });
  });
  it('clips viewport to city bounds and returns null for a disjoint viewport', () => {
    expect(intersectMapBounds([-1, -1, 0.8, 0.8], [0, 0, 1, 1])).toEqual([0, 0, 0.8, 0.8]);
    expect(intersectMapBounds([2, 2, 3, 3], [0, 0, 1, 1])).toBeNull();
  });
});
