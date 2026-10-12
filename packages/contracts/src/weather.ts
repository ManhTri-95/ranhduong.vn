import { z } from 'zod';

export const WEATHER_CACHE_MS = 15 * 60_000;
export const WEATHER_OBSERVATION_MAX_AGE_MS = 30 * 60_000;
export const WeatherState = z.enum(['fog', 'sun', 'cloud', 'rain']);
export type WeatherState = z.infer<typeof WeatherState>;

/** Public weather never includes provider credentials or raw response fields. */
export const CityWeather = z.object({
  state: WeatherState,
  temperatureC: z.number().min(-90).max(60),
  isDay: z.boolean(),
  rainSoon: z.boolean(),
  observedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export type CityWeather = z.infer<typeof CityWeather>;

/** Only the fields used from WeatherAPI forecast.json; unknown fields are discarded. */
export const WeatherApiResponse = z.object({
  current: z.object({
    last_updated_epoch: z.number().int().positive(),
    temp_c: CityWeather.shape.temperatureC,
    is_day: z.union([z.literal(0), z.literal(1)]),
    condition: z.object({ code: z.number().int() }),
  }),
  forecast: z.object({ forecastday: z.array(z.object({ hour: z.array(z.object({
    time_epoch: z.number().int().positive(),
    chance_of_rain: z.number().int().min(0).max(100),
  })).max(24) })).min(1).max(3) }),
});

// Source: https://www.weatherapi.com/docs/weather_conditions.json
const rainCodes = new Set([1063, 1072, 1087, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246, 1273, 1276]);
export function weatherApiState(code: number): WeatherState | null {
  if (code === 1000) return 'sun';
  if ([1003, 1006, 1009].includes(code)) return 'cloud';
  if ([1030, 1135, 1147].includes(code)) return 'fog';
  return rainCodes.has(code) ? 'rain' : null;
}

/** Forecast hours use Unix timestamps, including the next day at local midnight. */
export function weatherFromApi(raw: unknown, now: Date): CityWeather | null {
  const parsed = WeatherApiResponse.safeParse(raw);
  if (!parsed.success || !Number.isFinite(now.getTime())) return null;
  const { current, forecast } = parsed.data;
  const state = weatherApiState(current.condition.code);
  const observedMs = current.last_updated_epoch * 1000;
  const ageMs = now.getTime() - observedMs;
  if (!state || ageMs >= WEATHER_OBSERVATION_MAX_AGE_MS || ageMs < -60_000) return null;
  const firstHour = Math.floor(now.getTime() / 3_600_000) * 3600;
  const hours = forecast.forecastday.flatMap((day) => day.hour);
  const chances: number[] = [];
  // WeatherAPI timestamps mark the start of each hourly forecast interval.
  // At 12:30, the three-hour window overlaps 12:00, 13:00, 14:00 and 15:00.
  for (let i = 0; (firstHour + i * 3600) * 1000 < now.getTime() + 3 * 3_600_000; i++) {
    const matching = hours.filter((hour) => hour.time_epoch === firstHour + i * 3600);
    if (matching.length !== 1) return null;
    chances.push(matching[0]!.chance_of_rain);
  }
  const rainSoon = state !== 'rain' && Math.max(...chances) >= 60;
  return CityWeather.parse({
    state: rainSoon ? 'rain' : state, temperatureC: current.temp_c, isDay: current.is_day === 1, rainSoon,
    observedAt: new Date(observedMs).toISOString(),
    expiresAt: new Date(Math.min(now.getTime() + WEATHER_CACHE_MS, observedMs + WEATHER_OBSERVATION_MAX_AGE_MS)).toISOString(),
  });
}

export function freshCityWeather(weather: CityWeather, nowMs: number): boolean {
  const observed = Date.parse(weather.observedAt);
  const expires = Date.parse(weather.expiresAt);
  return observed <= nowMs + 60_000 && observed > nowMs - WEATHER_OBSERVATION_MAX_AGE_MS
    && expires > nowMs && expires <= nowMs + WEATHER_CACHE_MS && expires <= observed + WEATHER_OBSERVATION_MAX_AGE_MS;
}
