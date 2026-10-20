import { describe, expect, it } from 'vitest';
import { fakeRequest, placesIn, planInput, SEASON_GIA_LAP } from '../../../testing/planner-fixtures';
import { prepare } from './plan-context';

describe('prepare', () => {
  it('ngày 1–4 theo nhịp độ của khách, ngày 5 luôn thong thả', () => {
    const ctx = prepare(planInput({ request: fakeRequest({ days: 5, pace: 'packed' }) }));
    expect(ctx.days.map((d) => [d.trip.day, d.pace, d.target])).toEqual([[1, 'packed', 6], [2, 'packed', 6], [3, 'packed', 6], [4, 'packed', 6], [5, 'relaxed', 4]]);
  });
  it('điểm tham quan không gồm quán ăn; ngày 5 chỉ cà phê, mua sắm, đặc sản', () => {
    const places = [...placesIn(0, 1, 1), ...placesIn(0, 1, 2, { category: 'food' }), ...placesIn(0, 1, 3, { category: 'cafe' })];
    const ctx = prepare(planInput({ request: fakeRequest({ days: 5 }), places }));
    expect(ctx.days[0]?.visits.map((p) => p.place.category)).toEqual(['attraction', 'cafe']);
    expect(ctx.days[0]?.scored.size).toBe(3);
    expect(ctx.days[4]?.visits.map((p) => p.place.category)).toEqual(['cafe']);
  });
  it('cờ mưa theo từng ngày từ City.seasons', () => {
    const seasons = [{ ...SEASON_GIA_LAP, kind: 'rain' as const, from: '11-01', to: '11-30' }];
    expect(prepare(planInput({ request: fakeRequest({ days: 3, startDate: '2026-11-29' }), seasons })).days.map((d) => d.rainy)).toEqual([true, true, false]);
  });
  it('thứ tự places đầu vào không đổi danh sách ứng viên', () => {
    const places = [0, 1].flatMap((z) => placesIn(z, 4, z * 10));
    const visits = (list: typeof places) => prepare(planInput({ places: list })).days[0]?.visits.map((p) => p.place.id);
    expect(visits([...places].reverse())).toEqual(visits(places));
  });
});
