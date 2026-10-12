import { describe, expect, it } from 'vitest';
import { CityWeather, weatherApiState, weatherFromApi } from './weather.js';

const now = new Date('2026-10-12T05:30:00Z');
function response(code = 1000, chances = [10, 20, 30], at = now) {
  const firstHour = Math.floor(at.getTime() / 3_600_000) * 3600;
  return {
    current: { last_updated_epoch: at.getTime() / 1000, temp_c: 18.4, is_day: 1, condition: { code } },
    forecast: { forecastday: [{ hour: [
      { time_epoch: firstHour - 3600, chance_of_rain: 100 },
      { time_epoch: firstHour, chance_of_rain: 10 },
      ...chances.map((chance_of_rain, i) => ({ time_epoch: firstHour + (i + 1) * 3600, chance_of_rain })),
      { time_epoch: firstHour + 4 * 3600, chance_of_rain: 100 },
    ] }] },
  };
}

describe('S24 WeatherAPI condition mapping', () => {
  it.each([1000])('maps clear code %i to sun', (code) => expect(weatherApiState(code)).toBe('sun'));
  it.each([1003, 1006, 1009])('maps cloudy code %i', (code) => expect(weatherApiState(code)).toBe('cloud'));
  it.each([1030, 1135, 1147])('maps fog code %i', (code) => expect(weatherApiState(code)).toBe('fog'));
  it.each([1063, 1072, 1087, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246, 1273, 1276])('maps rain/drizzle/thunder code %i', (code) => expect(weatherApiState(code)).toBe('rain'));
  it.each([0, 9999, 1066, 1210, 1012, Number.NaN])('hides unrecognised or unsupported condition %i', (code) => expect(weatherApiState(code)).toBeNull());
});

describe('S24 weather observation and forecast', () => {
  it('keeps temperature, UTC observation, day flag and a fifteen-minute expiry', () => {
    expect(weatherFromApi(response(), now)).toEqual({ state: 'sun', temperatureC: 18.4, isDay: true, rainSoon: false, observedAt: now.toISOString(), expiresAt: '2026-10-12T05:45:00.000Z' });
  });
  it.each([59, 60])('uses inclusive 60%% threshold for the next three hours: %i', (chance) => {
    expect(weatherFromApi(response(1030, [10, chance, 20]), now)).toMatchObject({ state: chance >= 60 ? 'rain' : 'fog', rainSoon: chance >= 60 });
  });
  it('uses current rain even with a low forecast, without declaring it future-only', () => {
    expect(weatherFromApi(response(1183), now)).toMatchObject({ state: 'rain', rainSoon: false });
  });
  it('ignores past and more-than-three-hour rain probabilities', () => {
    expect(weatherFromApi(response(1003), now)?.state).toBe('cloud');
  });
  it('reads tomorrow when the three-hour window crosses Vietnamese midnight', () => {
    const at = new Date('2026-10-12T16:30:00Z');
    const raw = response(1000, [20, 60, 30], at);
    const hours = raw.forecast.forecastday[0]!.hour;
    raw.forecast.forecastday = [{ hour: hours.slice(0, 2) }, { hour: hours.slice(2) }];
    expect(weatherFromApi(raw, at)).toMatchObject({ state: 'rain', rainSoon: true });
  });
  it('uses the remaining current-hour forecast and excludes the hour beginning at the window end', () => {
    const raw = response();
    raw.forecast.forecastday[0]!.hour[1]!.chance_of_rain = 60;
    expect(weatherFromApi(raw, now)?.state).toBe('rain');
    const at = new Date('2026-10-12T05:00:00Z');
    expect(weatherFromApi(response(1000, [10, 20, 60], at), at)?.state).toBe('sun');
  });
  it('does not extend old observations with a new fetch time', () => {
    const raw = response();
    raw.current.last_updated_epoch -= 20 * 60;
    expect(weatherFromApi(raw, now)?.expiresAt).toBe('2026-10-12T05:40:00.000Z');
  });
  it.each([-1800, 61])('hides observations outside the freshness window: offset %i seconds', (seconds) => {
    const raw = response();
    raw.current.last_updated_epoch += seconds;
    expect(weatherFromApi(raw, now)).toBeNull();
  });
  it('uses is_day for clear nights', () => {
    const raw = response(); raw.current.is_day = 0;
    expect(weatherFromApi(raw, now)).toMatchObject({ state: 'sun', isDay: false });
  });
  it('hides incomplete and duplicate hourly coverage', () => {
    const missing = response(1000, [10, 20]);
    expect(weatherFromApi(missing, now)).toBeNull();
    const duplicate = response();
    duplicate.forecast.forecastday[0]!.hour[3]!.time_epoch = duplicate.forecast.forecastday[0]!.hour[2]!.time_epoch;
    expect(weatherFromApi(duplicate, now)).toBeNull();
  });
  it.each([null, {}, response(9999), response(1000, [101, 20, 30]), response(1000, [-1, 20, 30])])('hides malformed or unsupported provider data', (raw) => expect(weatherFromApi(raw, now)).toBeNull());
  it('rejects nonfinite temperature and malformed expiry in public contracts', () => {
    const weather = weatherFromApi(response(), now);
    expect(CityWeather.safeParse({ ...weather, temperatureC: Number.NaN }).success).toBe(false);
    expect(CityWeather.safeParse({ ...weather, expiresAt: 'tomorrow' }).success).toBe(false);
  });
});
