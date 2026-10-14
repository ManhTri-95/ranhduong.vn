import { describe, expect, it, vi } from 'vitest';
import type { CitiesService } from '../cities/cities.service';
import type { PlacesService } from '../places/places.service';
import type { ItinerariesRepository } from './itineraries.repository';
import { ItinerariesService } from './itineraries.service';

const PLACE_ID = '0123456789abcdef01234567';
const row = {
  slug: 'lich-trinh-mua-gia-lap', title: 'Lịch trình mùa Giả Lập', season: 'Mùa Giả Lập',
  params: { days: 1, transport: 'motorbike', pace: 'relaxed' },
  days: [{ stops: [{ placeId: PLACE_ID, start: '08:00', end: '09:00' }, { placeId: PLACE_ID, start: '10:00', end: '11:00' }] }],
};

describe('ItinerariesService.featuredTemplate', () => {
  it('thẻ lịch trình nổi bật của mùa giữ chip mùa và số điểm dừng như thẻ trong danh sách', async () => {
    const repo = { featuredTemplate: vi.fn().mockResolvedValue(row) };
    const places = { coverKeys: vi.fn().mockResolvedValue(new Map()) };
    const service = new ItinerariesService(repo as unknown as ItinerariesRepository, {} as CitiesService, places as unknown as PlacesService);
    expect(await service.featuredTemplate('0123456789abcdef01234568', 'x')).toMatchObject({ season: 'Mùa Giả Lập', stopCount: 2 });
  });
});
