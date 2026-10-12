import { Logger } from '@nestjs/common';
import type { CitySeasonContext } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { WeatherService } from './weather.service';

const now = new Date('2026-10-12T05:30:00Z');
const context: CitySeasonContext = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', center: { type: 'Point', coordinates: [0.3, 0.2] }, accent: '#E9B824', timezone: 'Asia/Ho_Chi_Minh', seasons: [], updatedAt: now.toISOString() };
const raw = { current: { last_updated_epoch: now.getTime() / 1000, temp_c: 18.4, is_day: 1, condition: { code: 1183 } }, forecast: { forecastday: [{ hour: [5, 6, 7, 8].map((hour) => ({ time_epoch: new Date(`2026-10-12T0${hour}:00:00Z`).getTime() / 1000, chance_of_rain: 20 })) }] } };
const weather = { state: 'rain', temperatureC: 18.4, isDay: true, rainSoon: false, observedAt: now.toISOString(), expiresAt: '2026-10-12T05:45:00.000Z' };
function setup(key = 'fake-weather-key') {
  const cache = new Map<string, string>();
  const redis = { get: vi.fn(async (name: string) => cache.get(name) ?? null), set: vi.fn<(name: string, value: string, mode: 'PX', ttl: number) => Promise<'OK'>>(async (name, value) => { cache.set(name, value); return 'OK'; }) };
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(raw)));
  vi.stubGlobal('fetch', fetcher);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  return { service: new WeatherService({ WEATHERAPI_KEY: key }, redis as unknown as Redis), redis, fetcher, cache };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('S24 server WeatherAPI and cache', () => {
  it('uses city lat,lng, two forecast days and a server-only key; caches only the public weather', async () => {
    const { service, fetcher, redis } = setup();
    expect(await service.current(context, now)).toEqual(weather);
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe('https://api.weatherapi.com/v1/forecast.json');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ key: 'fake-weather-key', q: '0.2,0.3', days: '2', aqi: 'no', alerts: 'no' });
    const call = redis.set.mock.calls[0]!;
    expect(call[1]).not.toContain('fake-weather-key');
    expect(call[2]).toBe('PX');
    expect(call[3]).toBeGreaterThan(899_000);
    expect(call[3]).toBeLessThanOrEqual(900_000);
    expect(await service.current(context, now)).toEqual(weather);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('does not call the provider or read old caches without an API key', async () => {
    const { service, fetcher, redis } = setup('');
    expect(await service.current(context, now)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });
  it('coalesces concurrent requests for the same city, and separates city coordinates', async () => {
    const { service, fetcher } = setup();
    const results = await Promise.all(Array.from({ length: 12 }, () => service.current(context, now)));
    expect(results.every((result) => result?.state === 'rain')).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    await service.current({ ...context, center: { type: 'Point', coordinates: [0.4, 0.3] } }, now);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(['expired', 'future', 'broken', 'wrong-state'])('rejects %s cached weather and never serves it after a provider failure', async (kind) => {
    const { service, redis, fetcher } = setup();
    const cached = kind === 'expired' ? { ...weather, expiresAt: now.toISOString() } : kind === 'future' ? { ...weather, expiresAt: '2026-10-13T05:45:00.000Z' } : { ...weather, state: 'unknown' };
    redis.get.mockResolvedValueOnce(kind === 'broken' ? '{' : JSON.stringify(cached));
    fetcher.mockRejectedValueOnce(new Error('fake failure'));
    expect(await service.current(context, now)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
  it.each(['get', 'set'] as const)('still returns new valid weather when Redis %s fails', async (operation) => {
    const { service, redis } = setup();
    redis[operation].mockRejectedValueOnce(new Error('fake redis failure'));
    expect(await service.current(context, now)).toEqual(weather);
  });
  it.each([401, 403, 429, 500])('hides provider HTTP %i without caching the failure', async (status) => {
    const { service, fetcher, redis } = setup();
    fetcher.mockResolvedValueOnce(new Response('{}', { status }));
    expect(await service.current(context, now)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
  it.each(['not-json', '{}', JSON.stringify({ ...raw, current: { ...raw.current, last_updated_epoch: now.getTime() / 1000 - 1800 } })])('hides invalid or old provider data', async (body) => {
    const { service, fetcher, redis } = setup();
    fetcher.mockResolvedValueOnce(new Response(body));
    expect(await service.current(context, now)).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
  it('never logs a provider URL/error containing the API key', async () => {
    const { service, fetcher } = setup();
    fetcher.mockRejectedValueOnce(new Error('https://api.weatherapi.com?key=fake-weather-key'));
    await service.current(context, now);
    expect(JSON.stringify(vi.mocked(Logger.prototype.warn).mock.calls)).not.toContain('fake-weather-key');
  });
  it('times out a stuck Redis read and still loads weather', async () => {
    vi.useFakeTimers();
    const { service, redis, fetcher } = setup();
    redis.get.mockImplementationOnce(() => new Promise(() => {}));
    const pending = service.current(context, now);
    await vi.advanceTimersByTimeAsync(250);
    expect(await pending).toEqual(weather);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('aborts a stuck fetch within three seconds and does not wait indefinitely', async () => {
    vi.useFakeTimers();
    const { service, fetcher, redis } = setup();
    fetcher.mockImplementationOnce(() => new Promise(() => {}));
    const pending = service.current(context, now);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toBeNull();
    expect(fetcher.mock.calls[0]![1]?.signal?.aborted).toBe(true);
    expect(redis.set).not.toHaveBeenCalled();
  });
  it('writes a real Redis TTL and reuses the cached observation without renewing it', async () => {
    const redis = await connectTestRedis();
    try {
      const { fetcher } = setup();
      const service = new WeatherService({ WEATHERAPI_KEY: 'fake-weather-key' }, redis);
      expect(await service.current(context, now)).toEqual(weather);
      const key = 'city-weather:v1:aaaaaaaaaaaaaaaaaaaaaaaa:0.3,0.2';
      const ttl = await redis.pttl(key);
      expect(ttl).toBeGreaterThan(890_000);
      expect(ttl).toBeLessThanOrEqual(900_000);
      expect(await service.current(context, now)).toEqual(weather);
      expect(await redis.pttl(key)).toBeLessThanOrEqual(ttl);
      expect(fetcher).toHaveBeenCalledOnce();
    } finally { await dropTestRedis(redis); }
  });
});
