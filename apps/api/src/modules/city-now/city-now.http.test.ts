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
  afterEach(() => vi.restoreAllMocks());
  it('returns fresh public weather and bounds HTTP TTL to its expiry without exposing context', async () => {
    const weather = { state: 'rain' as const, temperatureC: 18, isDay: true, rainSoon: false, observedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300_000).toISOString() };
    const source = vi.spyOn(t.app.get(WeatherService), 'current').mockResolvedValue(weather);
    const response = await fetch(`${t.url}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/public, max-age=29[89], s-maxage=29[89]/);
    const body: unknown = await response.json();
    expect(CityNow.parse(body)).toMatchObject({ weather, expiresAt: weather.expiresAt });
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
