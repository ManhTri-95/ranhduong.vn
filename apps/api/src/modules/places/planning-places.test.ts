import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { PlacesService } from './places.service';
import type { PlacesRepository } from './places.repository';
import type { CitiesService } from '../cities/cities.service';
import { fakePlaceDoc } from '../../testing/fixtures';
import { fakeRequest, NOW, planInput, ZONES } from '../../testing/planner-fixtures';
import { prepare } from '../itineraries/planner/plan-context';

describe('S36 planning snapshot', () => {
  it('excludes inactive high-view places before normalizing popularity', async () => {
    const cityId = new Types.ObjectId().toString();
    const id = (n: number) => new Types.ObjectId(n.toString(16).padStart(24, '0'));
    const base = { zoneId: new Types.ObjectId(ZONES[0]!.id), openingHours: [{ day: 1, open: '07:00', close: '22:00' }], lastVerifiedAt: NOW };
    const rows = [
      fakePlaceDoc(cityId, { ...base, _id: id(1) }),
      fakePlaceDoc(cityId, { ...base, _id: id(2), tags: ['gia-dinh'] }),
      fakePlaceDoc(cityId, { ...base, _id: id(3), status: 'hidden' }),
    ];
    const service = new PlacesService({ templatePlaces: async () => rows } as unknown as PlacesRepository, {} as CitiesService);
    const places = await service.planningPlaces(cityId);
    const context = prepare(planInput({ places, request: fakeRequest({ with: 'family', tags: ['chill_cafe'] }), popularity: new Map([[id(1).toString(), 100], [id(3).toString(), 10_000]]) }));
    expect(context.days[0]?.visits[0]?.place.id).toBe(id(1).toString());
  });

  it('preserves scoring fields and missing duration but rejects a whole record with malformed hours', async () => {
    const cityId = new Types.ObjectId().toString();
    const id = new Types.ObjectId();
    const rows = [
      fakePlaceDoc(cityId, { _id: id, tags: ['chill'], bestTime: ['sunrise'], cover: 'full', transport: ['motorbike'], priceLevel: 3, visitDurationMin: null }),
      fakePlaceDoc(cityId, { _id: new Types.ObjectId(), openingHours: [{ day: 1, open: '09:00', close: '12:00' }, { day: 9, open: 'abc', close: 'xyz' }] }),
    ];
    const repo = { templatePlaces: async (requested: string) => requested === cityId ? rows : [] };
    const service = new PlacesService(repo as unknown as PlacesRepository, {} as CitiesService);
    expect(await service.planningPlaces(cityId)).toMatchObject([{ id: id.toString(), tags: ['chill'], bestTime: ['sunrise'], cover: 'full', transport: ['motorbike'], priceLevel: 3 }]);
    expect((await service.planningPlaces(cityId))[0]?.visitDurationMin).toBeUndefined();
  });
});
