import { describe, expect, it } from 'vitest';
import { CityNow, CitySeasonEditInput } from './city-season-admin.js';

const season = { key: 'hoa-gia-lap', kind: 'flower', from: '02-01', to: '02-29', accent: '#E58FA8', title: ' Mùa Giả Lập ', sub: ' Mô tả Giả Lập ', illustration: 'cherry-blossom' };
const input = { updatedAt: '2026-10-12T00:00:00.000Z', seasons: [season] };

describe('season admin contracts', () => {
  it('trims user copy and permits clearing all seasons', () => {
    expect(CitySeasonEditInput.parse(input).seasons[0]?.title).toBe('Mùa Giả Lập');
    expect(CitySeasonEditInput.parse({ ...input, seasons: [] }).seasons).toEqual([]);
  });
  it.each([{ from: '02-30' }, { accent: 'pink' }, { title: ' ' }, { sub: ' ' }, { featuredItineraryId: 'wrong' }, { kind: 'unknown' }])('rejects invalid input %j', (change) => {
    expect(CitySeasonEditInput.safeParse({ ...input, seasons: [{ ...season, ...change }] }).success).toBe(false);
  });
  it('rejects duplicate keys, too many seasons and missing versions', () => {
    expect(CitySeasonEditInput.safeParse({ ...input, seasons: [season, season] }).success).toBe(false);
    expect(CitySeasonEditInput.safeParse({ ...input, seasons: Array.from({ length: 25 }, (_, i) => ({ ...season, key: `mua-${i}` })) }).success).toBe(false);
    expect(CitySeasonEditInput.safeParse({ seasons: [] }).success).toBe(false);
  });
  it('removes internal IDs from the public response and validates expiry', () => {
    const parsed = CityNow.parse({ accent: '#E58FA8', season: { ...season, featuredItineraryId: '0123456789abcdef01234567' }, featuredItinerary: null, expiresAt: '2026-10-12T00:15:00.000Z' });
    expect(parsed.season).not.toHaveProperty('featuredItineraryId');
    expect(CityNow.safeParse({ ...parsed, expiresAt: 'tomorrow' }).success).toBe(false);
  });
});
