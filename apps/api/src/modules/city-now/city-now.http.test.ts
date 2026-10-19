import { CityNow } from '@ranhduong/contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { CityNowModule } from './city-now.module';
import { WeatherService } from './weather.service';

describe('S24 /now HTTP weather isolation', () => {
  let t: TestApp;
  const path = '/cities/thanh-pho-gia-lap/now';
  beforeAll(async () => {
    t = await createTestApp([CityNowModule]);
    await t.app.get(CitiesService).applySeed(fakeCitySeed());
  });
  afterAll(async () => { if (t) await t.close(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it.each([
    { now: '2026-10-19T05:00:00.000Z', ttl: 300, expiresAt: '2026-10-19T05:05:00.000Z' },
    { now: '2026-10-19T16:59:00.000Z', ttl: 60, expiresAt: '2026-10-19T17:00:00.000Z' },
  ])('returns fresh public weather with TTL $ttl at $now without exposing context', async ({ now, ttl, expiresAt }) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(now));
    const weather = { state: 'rain' as const, temperatureC: 18, isDay: true, rainSoon: false, observedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300_000).toISOString() };
    const source = vi.spyOn(t.app.get(WeatherService), 'current').mockResolvedValue(weather);
    const response = await fetch(`${t.url}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(`public, max-age=${ttl}, s-maxage=${ttl}`);
    const body: unknown = await response.json();
    expect(CityNow.parse(body)).toMatchObject({ weather, expiresAt });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('center');
    expect(source.mock.calls[0]?.[0].center).toEqual(fakeCitySeed().city.center);
  });
  it.each(['missing', 'failure'])('keeps HTTP 200 and season color with unavailable weather: %s', async (mode) => {
    const source = vi.spyOn(t.app.get(WeatherService), 'current');
    if (mode === 'failure') source.mockRejectedValueOnce(new Error('fake-weather-failure'));
    else source.mockResolvedValueOnce(null);
    const response = await fetch(`${t.url}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(CityNow.parse(await response.json())).toMatchObject({ weather: null, accent: fakeCitySeed().city.accent });
  });
  it('does not request weather for an unknown city', async () => {
    const source = vi.spyOn(t.app.get(WeatherService), 'current');
    expect((await fetch(`${t.url}/cities/khong-co/now`)).status).toBe(404);
    expect(source).not.toHaveBeenCalled();
  });
});
