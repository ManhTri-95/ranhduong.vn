import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceListQuery } from '@ranhduong/contracts';
import { fetchMapPlaces } from './place-map';

const place = { slug: 'dia-diem-gia-lap', name: 'Địa điểm Giả Lập', category: 'cafe', openingHours: [], unconfirmed: true, location: { type: 'Point', coordinates: [0.2, 0.3] } };
afterEach(() => vi.unstubAllGlobals());

describe('Living Map API adapter', () => {
  it('keeps supported filters through all viewport pages and publishes actual tag metadata', async () => {
    const queries: Record<string, unknown>[] = [];
    vi.stubGlobal('$fetch', async (_url: string, options: { query: Record<string, unknown> }) => {
      PlaceListQuery.parse(options.query);
      queries.push(options.query);
      return { items: [place], tags: [{ slug: 'chill', count: 1 }], nextCursor: options.query.cursor ? undefined : '0.-.dia-diem-gia-lap' };
    });
    const result = await fetchMapPlaces('http://api-gia-lap.invalid', 'da-lat', [0, 0, 1, 1], { category: 'cafe', rainSafe: true, zone: 'trung-tam', tags: ['chill'] }, new AbortController().signal);
    expect(queries).toHaveLength(2);
    expect(queries[1]).toMatchObject({ bbox: '0,0,1,1', category: 'cafe', zone: 'trung-tam', tags: 'chill', rainSafe: 'true', limit: 50 });
    expect(result.places).toHaveLength(1);
    expect(result.tags).toEqual([{ slug: 'chill', count: 1 }]);
  });
  it('keeps search within the existing unpaginated contract and rejects an aborted result', async () => {
    const controller = new AbortController();
    let calls = 0;
    vi.stubGlobal('$fetch', async (_url: string, options: { query: Record<string, unknown> }) => {
      expect(PlaceListQuery.parse(options.query).q).toBe('cà phê');
      calls++; controller.abort();
      return { items: [place], tags: [] };
    });
    await expect(fetchMapPlaces('http://api-gia-lap.invalid', 'da-lat', [0, 0, 1, 1], { q: 'cà phê', rainSafe: false }, controller.signal)).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
