import { describe, expect, it } from 'vitest';
import { MetricsService } from './metrics.service';
import type { MetricsRepository } from './metrics.repository';
import type { MetricsStore } from './metrics.store';
import type { CitiesService } from '../cities/cities.service';
import type { PlacesService } from '../places/places.service';

describe('S36 30-day popularity', () => {
  it('sums views over 30 Vietnam dates, merges live today by max, and keeps city/place boundaries', async () => {
    const repo = { weekly: async (cityId: string, start: string, end: string) => {
      if (cityId !== 'city' || start !== '2026-10-23' || end !== '2026-11-21') throw new Error('Wrong date/city scope');
      return [
        { placeId: 'one', dayKey: '2026-10-23', counts: { views: 5 } },
        { placeId: 'one', dayKey: '2026-11-21', counts: { views: 3 } },
        { placeId: 'two', dayKey: '2026-11-21', counts: { views: 9 } },
        { placeId: 'outside', dayKey: '2026-11-20', counts: { views: 100 } },
      ];
    } };
    const store = { counts: async (id: string, day: string) => {
      if (day !== '2026-11-21') throw new Error('Wrong live date');
      return { views: id === 'one' ? 7 : 2 };
    } };
    const service = new MetricsService(store as unknown as MetricsStore, repo as unknown as MetricsRepository, {} as CitiesService, {} as PlacesService);
    expect(await service.itineraryPopularity('city', ['one', 'two', 'empty'], new Date('2026-11-20T18:00:00Z'))).toEqual(new Map([['one', 12], ['two', 9], ['empty', 2]]));
  });
});
