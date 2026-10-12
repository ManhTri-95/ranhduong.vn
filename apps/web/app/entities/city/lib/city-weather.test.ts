import type { CityWeather } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { cityWeatherDisplay } from './city-weather';

const now = Date.parse('2026-10-12T05:30:00Z');
const weather: CityWeather = { state: 'sun', temperatureC: 18.4, isDay: true, rainSoon: false, observedAt: '2026-10-12T05:30:00.000Z', expiresAt: '2026-10-12T05:45:00.000Z' };
describe('S24 weather display', () => {
  it.each([['fog', 'Có sương'], ['sun', 'Nắng đẹp'], ['cloud', 'Nhiều mây'], ['rain', 'Mưa']] as const)('shows the Vietnamese %s label and rounded Celsius temperature', (state, label) => {
    expect(cityWeatherDisplay({ ...weather, state }, now)).toMatchObject({ title: `${label} · 18°C`, rainMode: state === 'rain' });
  });
  it('uses clear-sky copy at night and upcoming-rain copy for a forecast trigger', () => {
    expect(cityWeatherDisplay({ ...weather, isDay: false }, now)?.title).toBe('Trời trong · 18°C');
    expect(cityWeatherDisplay({ ...weather, state: 'rain', rainSoon: true }, now)?.title).toBe('Sắp có mưa · 18°C');
  });
  it('hides absent, failed and expired observations including the exact expiry', () => {
    expect(cityWeatherDisplay(null, now)).toBeNull();
    expect(cityWeatherDisplay(weather, now, true)).toBeNull();
    expect(cityWeatherDisplay(weather, Date.parse(weather.expiresAt))).toBeNull();
    expect(cityWeatherDisplay(weather, Date.parse(weather.expiresAt) + 1)).toBeNull();
  });
});
