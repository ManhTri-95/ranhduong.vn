import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CityNow, cityMonthDay, selectCitySeason } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { REDIS } from '../../shared/redis/redis.module';
import { CitiesService } from '../cities/cities.service';
import { ItinerariesService } from '../itineraries/itineraries.service';

export function seasonCacheExpiresAt(now: Date): Date {
  const dayMs = 86_400_000;
  const offsetMs = 7 * 3_600_000;
  const midnight = (Math.floor((now.getTime() + offsetMs) / dayMs) + 1) * dayMs - offsetMs;
  return new Date(Math.min(now.getTime() + 900_000, midnight));
}

@Injectable()
export class CityNowService {
  private readonly logger = new Logger(CityNowService.name);
  constructor(private readonly cities: CitiesService, private readonly itineraries: ItinerariesService, @Optional() @Inject(REDIS) private readonly redis?: Redis) {}

  async current(slug: string, now = new Date()): Promise<CityNow> {
    const context = await this.cities.seasonContext(slug);
    const key = `city-season:${context.id}:${context.updatedAt}:${cityMonthDay(now, context.timezone)}`;
    let result: CityNow | undefined;
    try {
      const cached = await this.redis?.get(key);
      if (cached) {
        const parsed = CityNow.safeParse(JSON.parse(cached));
        if (parsed.success && new Date(parsed.data.expiresAt).getTime() > now.getTime()) result = parsed.data;
      }
    } catch (error) { this.logger.warn(`Không đọc được cache mùa: ${error instanceof Error ? error.message : String(error)}`); }
    const selected = selectCitySeason(context.seasons, now, context.timezone);
    if (!result) {
      result = CityNow.parse({ accent: selected?.accent ?? context.accent, season: selected, featuredItinerary: null, expiresAt: seasonCacheExpiresAt(now).toISOString() });
      try { await this.redis?.set(key, JSON.stringify(result), 'PX', Math.max(1, new Date(result.expiresAt).getTime() - now.getTime())); }
      catch (error) { this.logger.warn(`Không ghi được cache mùa: ${error instanceof Error ? error.message : String(error)}`); }
    }
    // Re-check visibility every request; a cached season never publishes a withdrawn itinerary.
    const featuredItinerary = selected?.featuredItineraryId ? await this.itineraries.featuredTemplate(context.id, selected.featuredItineraryId) : null;
    return { ...result, featuredItinerary };
  }
}
