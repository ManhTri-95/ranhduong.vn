import { describe, expect, it, vi } from 'vitest';
import { fetchAreaPreview } from './area-preview';
import { fetchPlacePage } from './places';
vi.mock('./places', () => ({ fetchPlacePage: vi.fn() }));

describe('area map preview on intent', () => {
  it('requests actual geographic results in the existing zone/filter context without a stale cursor', async () => {
    vi.mocked(fetchPlacePage).mockResolvedValueOnce({ items: [], tags: [] });
    const controller = new AbortController();
    expect(await fetchAreaPreview('/v1', 'da-lat', 'trung-tam', [108, 11, 109, 12], { q: 'cafe', tags: ['chill'], category: 'cafe', rainSafe: true, cursor: '0.-.old' }, controller.signal)).toEqual([]);
    expect(fetchPlacePage).toHaveBeenLastCalledWith('/v1', 'da-lat', { zone: 'trung-tam', category: 'cafe', q: 'cafe', tags: 'chill', rainSafe: 'true', cursor: undefined, limit: 4, bbox: '108,11,109,12' }, controller.signal);
  });
  it('keeps real API order and discards missing or out-of-city coordinates without making up points', async () => {
    const base = { name: 'Quán Giả Lập', category: 'cafe' as const, openingHours: [], unconfirmed: true };
    vi.mocked(fetchPlacePage).mockResolvedValueOnce({ items: [
      { ...base, slug: 'missing' },
      { ...base, slug: 'located-b', location: { type: 'Point', coordinates: [108.2, 11.8] } },
      { ...base, slug: 'outside', location: { type: 'Point', coordinates: [110, 13] } },
      { ...base, slug: 'located-a', location: { type: 'Point', coordinates: [108.3, 11.7] } },
    ], tags: [] });
    const result = await fetchAreaPreview('/v1', 'da-lat', 'trung-tam', [108, 11, 109, 12], { tags: [], rainSafe: false }, new AbortController().signal);
    expect(result.map(place => place.slug)).toEqual(['located-b', 'located-a']);
  });
  it('propagates request failure so the real preview can retry', async () => {
    vi.mocked(fetchPlacePage).mockRejectedValueOnce(new Error('Network unavailable'));
    await expect(fetchAreaPreview('/v1', 'da-lat', 'trung-tam', [108, 11, 109, 12], { tags: [], rainSafe: false }, new AbortController().signal)).rejects.toThrow('Network unavailable');
  });
});
