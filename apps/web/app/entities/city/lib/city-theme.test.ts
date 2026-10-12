import type { CityNow } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { cityThemeAccent } from './city-theme';
const current: CityNow = { accent: '#E58FA8', season: null, featuredItinerary: null, expiresAt: '2026-10-12T00:15:00.000Z' };
describe('city theme fallback', () => {
  it('uses seasonal color for SSR/hydration then checks freshness on the client', () => {
    expect(cityThemeAccent('#123456', current, 0)).toBe('#E58FA8');
    expect(cityThemeAccent('#123456', current, Date.parse('2026-10-12T00:14:59Z'))).toBe('#E58FA8');
    expect(cityThemeAccent('#123456', current, Date.parse('2026-10-12T00:15:00Z'))).toBe('#123456');
  });
  it('falls back on failure or missing data and rejects CSS injected as a color', () => {
    expect(cityThemeAccent('#123456', current, 0, true)).toBe('#123456');
    expect(cityThemeAccent('#123456', null, 0)).toBe('#123456');
    expect(cityThemeAccent('#123456', { ...current, accent: 'red;background:url(fake)' }, 0)).toBe('#123456');
    expect(cityThemeAccent(undefined, null, 0)).toBeUndefined();
  });
});
