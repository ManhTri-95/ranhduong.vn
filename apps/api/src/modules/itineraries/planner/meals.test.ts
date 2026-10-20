import type { ItineraryPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { allDays, fakePlace, placesIn } from '../../../testing/planner-fixtures';
import { dayPriceCap, insertMeals } from './meals';
import type { ScoredPlace } from './scoring';
import { timeStops, toDayStop, type DayStop } from './timing';

// Thứ Hai; bốn điểm 90 phút: 07:00–08:30, 08:40–10:10, 10:20–11:50, 12:00–13:30 (mỗi chặng 10 phút).
const day: DayStop[] = placesIn(0, 4, 1, { visitDurationMin: 90 }).map((place) => toDayStop({ place, score: 0, match: 0 }, 'visit')!);
const food = (n: number, overrides: Partial<ItineraryPlace> = {}, score = 0): ScoredPlace => ({ place: fakePlace(n, { category: 'food', ...overrides }), score, match: 0 });
const kinds = (r: { stops: DayStop[] }) => r.stops.map((s) => s.kind);
const mealOf = (r: { stops: DayStop[] }) => r.stops.find((s) => s.kind === 'meal')?.place.id;

describe('S35 meals', () => {
  it('dayPriceCap: thiếu tính là 2', () => {
    expect([dayPriceCap([]), dayPriceCap([{ priceLevel: 1 }, {}]), dayPriceCap([{ priceLevel: 1 }]), dayPriceCap([{ priceLevel: 4 }, {}])]).toEqual([2, 2, 1, 4]);
  });

  it('chèn bữa trưa ở chỗ thêm ít thời gian nhất; ngày không qua khung tối thì không có bữa tối', () => {
    const r = insertMeals(day, [food(5)], 1, new Set());
    expect(kinds(r)).toEqual(['visit', 'visit', 'visit', 'meal', 'visit']);
    expect(timeStops(r.stops, 1).stops[3]?.start).toBe(720);
    expect(r.missing).toEqual([]);
  });

  it('chọn quán đi vòng ít hơn', () => {
    expect(mealOf(insertMeals(day, [food(7, { location: { type: 'Point', coordinates: [0.2, 0.1] } }), food(5)], 1, new Set()))).toBe(fakePlace(5).id);
  });

  it('bằng thời gian thì quán đúng mức giá trước, rồi điểm số', () => {
    const near = fakePlace(5).location;
    const foods = [food(6, { priceLevel: 4, location: near }, 0.9), food(5, { priceLevel: 1 }, 0.1)];
    expect(mealOf(insertMeals(day, foods, 1, new Set()))).toBe(fakePlace(5).id);
    const pricey = day.map((s, i) => (i === 0 ? { ...s, place: { ...s.place, priceLevel: 4 as const } } : s));
    expect(mealOf(insertMeals(pricey, foods, 1, new Set()))).toBe(fakePlace(6).id);
  });

  it('quán chia ca được chọn trong ca; quán chỉ mở chiều thì thiếu bữa trưa', () => {
    const split = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [{ day: d, open: '10:00', close: '14:00' }, { day: d, open: '17:00', close: '21:00' }]);
    expect(mealOf(insertMeals(day, [food(5, { openingHours: split })], 1, new Set()))).toBe(fakePlace(5).id);
    expect(insertMeals(day, [food(5, { openingHours: allDays('15:00', '22:00') })], 1, new Set()).missing).toEqual(['lunch']);
  });

  it('không có quán thì báo thiếu, giữ nguyên điểm', () => {
    const r = insertMeals(day, [], 1, new Set());
    expect([r.missing, r.stops]).toEqual([['lunch'], day]);
  });

  it('bỏ quán đã dùng trong chuyến và chỗ ăn uống đang là điểm ghé', () => {
    const dualUse = day.map((s, i) => (i === 3 ? { ...s, place: { ...s.place, alsoCategories: ['food' as const] } } : s));
    const asFood = { place: dualUse[3]!.place, score: 1, match: 0 };
    expect(mealOf(insertMeals(dualUse, [asFood, food(5, {}, 0.9), food(8)], 1, new Set([fakePlace(5).id])))).toBe(fakePlace(8).id);
  });

  it('không chèn bữa sau điểm ghim cuối', () => {
    const v1 = toDayStop({ place: fakePlace(1, { visitDurationMin: 240 }), score: 0, match: 0 }, 'visit')!;
    const last = toDayStop({ place: fakePlace(2, { bestTime: ['evening'], openingHours: allDays('07:00', '12:30') }), score: 0, match: 0 }, 'visit')!;
    expect(insertMeals([v1, last], [food(5)], 1, new Set())).toEqual({ stops: [v1, last], missing: ['lunch'] });
  });
});
