import type { ItineraryPlace, PlaceCategory } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { fakePlace, NOW, ZONES } from '../../../testing/planner-fixtures';
import { isEligible, isLeisurePlace, isVisitPlace, opensOn, type DayFilter } from './candidates';

const DAY_MS = 86_400_000;
const filter: DayFilter = { weekday: 1, transport: 'motorbike', now: NOW, zoneIds: new Set(ZONES.map((z) => z.id)) };

describe('opensOn', () => {
  it('không tính ca qua đêm của hôm trước và ca có giờ mở trùng giờ đóng', () => {
    expect(opensOn([{ day: 1, open: '18:00', close: '02:00' }], 2)).toBe(false);
    expect(opensOn([{ day: 2, open: '08:00', close: '08:00' }], 2)).toBe(false);
  });
  it('mở khi có ca của đúng thứ, kể cả 24h', () => {
    expect(opensOn([{ day: 2, open: '00:00', close: '24:00' }], 2)).toBe(true);
    expect(opensOn([{ day: 1, open: '18:00', close: '02:00' }], 1)).toBe(true);
  });
});

describe('isEligible', () => {
  it('nhận điểm đủ điều kiện, kể cả xác minh đúng 90 ngày và transport chưa nhập', () => {
    expect(isEligible(fakePlace(1), filter)).toBe(true);
    expect(isEligible(fakePlace(1, { lastVerifiedAt: new Date(NOW.getTime() - 90 * DAY_MS).toISOString() }), filter)).toBe(true);
  });
  it.each<[string, Partial<ItineraryPlace>]>([
    ['bị nghi ngờ', { status: 'suspected' }],
    ['còn nháp', { status: 'draft' }],
    ['chưa xác minh', { lastVerifiedAt: undefined }],
    ['quá 90 ngày chưa xác minh', { lastVerifiedAt: new Date(NOW.getTime() - 90 * DAY_MS - 1).toISOString() }],
    ['thiếu toạ độ', { location: undefined }],
    ['thiếu cụm', { zoneId: undefined }],
    ['thuộc cụm không có trong thành phố', { zoneId: 'ffffffffffffffffffffffff' }],
    ['chưa có giờ mở cửa', { openingHours: [] }],
    ['giờ mở cửa không hợp lệ', { openingHours: [{ day: 3, open: '08:00', close: '08:00' }, { day: 1, open: '07:00', close: '22:00' }] }],
    ['đóng cửa Thứ Hai', { openingHours: [{ day: 2, open: '07:00', close: '22:00' }] }],
    ['chỉ đi ô tô được', { transport: ['car'] }],
  ])('loại điểm %s', (_, overrides) => {
    expect(isEligible(fakePlace(1, overrides), filter)).toBe(false);
  });
  it('taxi cần điểm cho ô tô tới được', () => {
    expect(isEligible(fakePlace(1, { transport: ['motorbike'] }), { ...filter, transport: 'taxi' })).toBe(false);
    expect(isEligible(fakePlace(1, { transport: ['car'] }), { ...filter, transport: 'taxi' })).toBe(true);
  });
});

describe('isVisitPlace, isLeisurePlace', () => {
  it('điểm tham quan là tham quan, cà phê, hoạt động, mua sắm (chính hoặc phụ)', () => {
    const categories: PlaceCategory[] = ['attraction', 'cafe', 'activity', 'shop', 'food', 'stay'];
    expect(categories.map((category) => isVisitPlace(fakePlace(1, { category })))).toEqual([true, true, true, true, false, false]);
    expect(isVisitPlace(fakePlace(1, { category: 'food', alsoCategories: ['cafe'] }))).toBe(true);
  });
  it('ngày thong thả chỉ nhận cà phê, mua sắm hoặc thẻ đặc sản', () => {
    expect([
      isLeisurePlace(fakePlace(1, { category: 'cafe' })),
      isLeisurePlace(fakePlace(1)),
      isLeisurePlace(fakePlace(1, { tags: ['dac-san'] })),
      isLeisurePlace(fakePlace(1, { category: 'food', alsoCategories: ['shop'] })),
    ]).toEqual([true, false, true, true]);
  });
});
