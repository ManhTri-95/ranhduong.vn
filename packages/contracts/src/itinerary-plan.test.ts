import { describe, expect, it } from 'vitest';
import { ItineraryPlace, NotEnoughPlacesDetails, PlanSuggestion } from './itinerary-plan.js';

// Địa điểm giả, tên rõ là giả.
const PLACE = {
  id: '0123456789abcdef01234567', name: 'Điểm Giả Lập', slug: 'diem-gia-lap', category: 'attraction', alsoCategories: [], status: 'active',
  zoneId: '0123456789abcdef01234568', location: { type: 'Point', coordinates: [108.4, 11.9] },
  openingHours: [{ day: 1, open: '07:00', close: '22:00' }], lastVerifiedAt: '2026-11-10T00:00:00.000Z', validPhoto: true,
  tags: ['chill'], bestTime: ['sunrise'], cover: 'full', transport: ['motorbike'],
};

describe('ItineraryPlace', () => {
  it('nhận dữ liệu lịch trình của một địa điểm', () => {
    expect(ItineraryPlace.parse(PLACE)).toMatchObject({ tags: ['chill'], bestTime: ['sunrise'], cover: 'full', transport: ['motorbike'] });
  });
  it('từ chối thẻ không phải slug', () => {
    expect(ItineraryPlace.safeParse({ ...PLACE, tags: ['Chill Cafe'] }).success).toBe(false);
  });
  it('nhận mức giá 1–4 cho bữa ăn S35, từ chối mức khác', () => {
    expect(ItineraryPlace.parse({ ...PLACE, priceLevel: 2 }).priceLevel).toBe(2);
    expect(ItineraryPlace.safeParse({ ...PLACE, priceLevel: 5 }).success).toBe(false);
  });
});

describe('NotEnoughPlacesDetails', () => {
  it('từ chối gợi ý giảm về 0 ngày', () => {
    expect(PlanSuggestion.safeParse({ kind: 'reduce_days', days: 0 }).success).toBe(false);
  });
  it('nhận ngày thiếu điểm không còn cụm nào và từ chối khi không có ngày thiếu', () => {
    const details = { shortages: [{ day: 4, zoneSlugs: [], available: 0 }], suggestions: [{ kind: 'reduce_days', days: 3 }, { kind: 'drop_interests' }] };
    expect(NotEnoughPlacesDetails.parse(details)).toEqual(details);
    expect(NotEnoughPlacesDetails.safeParse({ ...details, shortages: [] }).success).toBe(false);
  });
});
