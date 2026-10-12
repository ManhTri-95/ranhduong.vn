import { Logger } from '@nestjs/common';
import type { CitySeasonContext } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CitiesService } from '../cities/cities.service';
import type { ItinerariesService } from '../itineraries/itineraries.service';
import { CityNowService, seasonCacheExpiresAt } from './city-now.service';

const now = new Date('2026-10-12T05:00:00Z');
function context(accent: string, updatedAt: string): CitySeasonContext {
  return {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa', accent: '#E9B824', timezone: 'Asia/Ho_Chi_Minh', updatedAt,
    seasons: [{ key: 'hoa-gia-lap', kind: 'flower', from: '10-01', to: '12-01', accent, title: 'Mùa Giả Lập', sub: 'Mô tả Giả Lập', illustration: 'cherry-blossom' }],
  };
}
afterEach(() => { vi.restoreAllMocks(); });

describe('season cache expiry', () => {
  it('limits TTL to fifteen minutes and expires at Vietnamese midnight', () => {
    expect(seasonCacheExpiresAt(new Date('2026-10-12T05:00:00Z')).toISOString()).toBe('2026-10-12T05:15:00.000Z');
    expect(seasonCacheExpiresAt(new Date('2026-10-12T16:59:59Z')).toISOString()).toBe('2026-10-12T17:00:00.000Z');
    expect(seasonCacheExpiresAt(new Date('2026-10-12T17:00:00Z')).toISOString()).toBe('2026-10-12T17:15:00.000Z');
  });
});

describe('season cache failure and concurrent updates', () => {
  it.each(['get', 'set'] as const)('serves the stored season when Redis %s fails', async (operation) => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const cities = { seasonContext: vi.fn().mockResolvedValue(context('#E58FA8', '2026-10-12T00:00:00.000Z')) };
    const itineraries = { featuredTemplate: vi.fn() };
    const redis = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK') };
    redis[operation].mockRejectedValueOnce(new Error('Redis Giả Lập không kết nối'));
    const service = new CityNowService(cities as unknown as CitiesService, itineraries as unknown as ItinerariesService, redis as unknown as Redis);
    const result = await service.current('thanh-pho-gia-lap', now);
    expect(result.accent).toBe('#E58FA8');
    expect(result.season?.title).toBe('Mùa Giả Lập');
    expect(result.featuredItinerary).toBeNull();
    expect(result.expiresAt).toBe('2026-10-12T05:15:00.000Z');
  });

  it('keeps the new season cached when an older request finishes after an admin update', async () => {
    let current = context('#E58FA8', '2026-10-12T00:00:00.000Z');
    const cities = { seasonContext: vi.fn(async () => structuredClone(current)) };
    const itineraries = { featuredTemplate: vi.fn() };
    const cache = new Map<string, string>();
    let releaseOldRead!: (value: null) => void;
    const delayedRead = new Promise<null>((resolve) => { releaseOldRead = resolve; });
    const redis = {
      get: vi.fn(async (key: string) => cache.get(key) ?? null).mockImplementationOnce(() => delayedRead),
      set: vi.fn(async (key: string, value: string) => { cache.set(key, value); return 'OK'; }),
    };
    const service = new CityNowService(cities as unknown as CitiesService, itineraries as unknown as ItinerariesService, redis as unknown as Redis);
    const oldRequest = service.current('thanh-pho-gia-lap', now);
    await vi.waitFor(() => expect(redis.get).toHaveBeenCalledOnce());
    current = context('#91C5A9', '2026-10-12T00:00:01.000Z');
    expect((await service.current('thanh-pho-gia-lap', now)).accent).toBe('#91C5A9');
    releaseOldRead(null);
    expect((await oldRequest).accent).toBe('#E58FA8');
    const writesBeforeCacheHit = redis.set.mock.calls.length;
    expect((await service.current('thanh-pho-gia-lap', now)).accent).toBe('#91C5A9');
    expect(redis.set).toHaveBeenCalledTimes(writesBeforeCacheHit);
  });
});
