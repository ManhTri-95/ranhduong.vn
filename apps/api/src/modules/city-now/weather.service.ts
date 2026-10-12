import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CityWeather, WEATHER_CACHE_MS, freshCityWeather, weatherFromApi, type CitySeasonContext } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { ENV, type Env } from '../../config/env';
import { REDIS } from '../../shared/redis/redis.module';

const WEATHER_TIMEOUT_MS = 3000;
const REDIS_TIMEOUT_MS = 200;

async function within<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Weather operation timed out')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly inFlight = new Map<string, Promise<CityWeather | null>>();
  constructor(
    @Optional() @Inject(ENV) private readonly env?: Pick<Env, 'WEATHERAPI_KEY'>,
    @Optional() @Inject(REDIS) private readonly redis?: Redis,
  ) {}

  async current(context: CitySeasonContext, now = new Date()): Promise<CityWeather | null> {
    if (!this.env?.WEATHERAPI_KEY) return null;
    const key = `city-weather:v1:${context.id}:${context.center.coordinates.join(',')}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const request = this.request(key, context, now);
    this.inFlight.set(key, request);
    try { return await request; }
    finally { if (this.inFlight.get(key) === request) this.inFlight.delete(key); }
  }

  private async request(key: string, context: CitySeasonContext, now: Date): Promise<CityWeather | null> {
    const abort = new AbortController();
    try { return await within(this.load(key, context, now, abort.signal), WEATHER_TIMEOUT_MS); }
    catch {
      // Provider errors can contain the full URL with the secret key; never log their text.
      this.logger.warn('Không tải được thời tiết; ẩn ô thời tiết.');
      return null;
    } finally { abort.abort(); }
  }

  private async load(key: string, context: CitySeasonContext, now: Date, signal: AbortSignal): Promise<CityWeather | null> {
    const started = Date.now();
    const clock = () => now.getTime() + Math.max(0, Date.now() - started);
    try {
      const cached = this.redis ? await within(this.redis.get(key), REDIS_TIMEOUT_MS) : null;
      if (cached) {
        const parsed = CityWeather.safeParse(JSON.parse(cached));
        if (parsed.success && freshCityWeather(parsed.data, clock())) return parsed.data;
      }
    } catch { this.logger.warn('Không đọc được cache thời tiết.'); }
    signal.throwIfAborted();
    const [lng, lat] = context.center.coordinates;
    const url = new URL('https://api.weatherapi.com/v1/forecast.json');
    url.search = new URLSearchParams({ key: this.env!.WEATHERAPI_KEY!, q: `${lat},${lng}`, days: '2', aqi: 'no', alerts: 'no' }).toString();
    const response = await fetch(url, { signal, redirect: 'error' });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    signal.throwIfAborted();
    const weather = weatherFromApi(raw, new Date(clock()));
    if (!weather) return null;
    // Time spent fetching never extends the fifteen-minute window of this request.
    weather.expiresAt = new Date(Math.min(Date.parse(weather.expiresAt), now.getTime() + WEATHER_CACHE_MS)).toISOString();
    try {
      if (this.redis) await within(this.redis.set(key, JSON.stringify(weather), 'PX', Math.max(1, Date.parse(weather.expiresAt) - clock())), REDIS_TIMEOUT_MS);
    } catch { this.logger.warn('Không ghi được cache thời tiết.'); }
    return !signal.aborted && freshCityWeather(weather, clock()) ? weather : null;
  }
}
