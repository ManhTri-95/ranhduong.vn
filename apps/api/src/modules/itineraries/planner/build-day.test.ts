import { DAY_END_MIN, type CitySeason, type ItineraryPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { allDays, fakePlace, placesIn, planInput, SEASON_GIA_LAP, ZONES } from '../../../testing/planner-fixtures';
import { buildDay } from './build-day';
import { prepare, type DayPool, type PlanInput } from './plan-context';

// Ngày 1 của planInput là Thứ Hai 23/11/2026.
const dayOf = (places: ItineraryPlace[], options: Partial<PlanInput> = {}) => prepare(planInput({ places, ...options })).days[0]!;
const pickAll = (pool: DayPool) => ({ zoneIds: [ZONES[0]!.id], picks: [...pool.visits] });

describe('S35 buildDay', () => {
  it('ngày thong thả: mọi điểm trong giờ, có bữa trưa trong khung, kết thúc trước 21:30', () => {
    const pool = dayOf([...placesIn(0, 4, 1, { visitDurationMin: 90 }), fakePlace(9, { category: 'food' })]);
    const d = buildDay(pool, pickAll(pool), { used: new Set() });
    const meal = d.stops.findIndex((s) => s.kind === 'meal');
    expect(d.times.stops[meal]!.start).toBeGreaterThanOrEqual(690);
    expect(d.times.stops[meal]!.start).toBeLessThan(810);
    expect(d.times.stops.every((s) => s.withinHours)).toBe(true);
    expect(d.times.lateFinish).toBe(false);
    expect(d.missingMeals).toEqual([]);
  });

  it('ghim bình minh đầu ngày lúc 04:45, ghim buổi tối cuối ngày sau khi chờ mở cửa', () => {
    const s = fakePlace(1, { bestTime: ['sunrise'], openingHours: allDays('04:00', '22:00') });
    const e = fakePlace(4, { bestTime: ['evening'], openingHours: allDays('17:00', '23:00') });
    const pool = dayOf([s, ...placesIn(0, 2, 2), e, fakePlace(9, { category: 'food' })]);
    const d = buildDay(pool, pickAll(pool), { used: new Set() });
    expect([d.stops[0]!.place.id, d.times.stops[0]!.start]).toEqual([s.id, 285]);
    expect(d.stops.at(-1)!.place.id).toBe(e.id);
    expect(d.times.stops.at(-1)!.start).toBeGreaterThanOrEqual(1020);
    expect(d.stops.filter((x) => x.kind === 'meal')).toHaveLength(1);
  });

  it('quá 21:30 thì bỏ điểm điểm số thấp nhất', () => {
    const places = placesIn(0, 5, 1, { visitDurationMin: 180, openingHours: allDays('00:00', '24:00') });
    const pool = dayOf(places);
    const pick = { zoneIds: [ZONES[0]!.id], picks: places.map((place, i) => ({ place, score: 0.5 - i / 10, match: 0 })) };
    const d = buildDay(pool, pick, { used: new Set() });
    expect(d.stops.map((x) => x.place.id)).toEqual(places.slice(0, 4).map((p) => p.id));
    expect(d.times.stops.at(-1)!.end).toBeLessThanOrEqual(DAY_END_MIN);
  });

  it('ngày mưa đảo tuyến để điểm có mái che rơi vào buổi chiều; ngày thường giữ tuyến', () => {
    const line = [0, 1, 2, 3].map((x, i) => fakePlace(i + 1, {
      visitDurationMin: 120, cover: i === 0 ? 'full' : 'none', location: { type: 'Point', coordinates: [0.1 + x / 100, 0.1] },
    }));
    const rain = [{ ...SEASON_GIA_LAP, kind: 'rain' as const, from: '11-01', to: '11-30' }];
    const firstAndLast = (seasons: CitySeason[]) => {
      const pool = dayOf(line, { seasons });
      const d = buildDay(pool, pickAll(pool), { used: new Set() });
      return [d.stops[0]!.place.id, d.stops.at(-1)!.place.id];
    };
    expect(firstAndLast(rain)[1]).toBe(line[0]!.id);
    expect(firstAndLast([])[0]).toBe(line[0]!.id);
  });

  it('sai giờ tới mức còn dưới 3 điểm thì trả số điểm còn lại', () => {
    const places = [...placesIn(0, 2, 1), fakePlace(3, { openingHours: allDays('05:00', '05:30') })];
    const pool = dayOf(places);
    expect(buildDay(pool, pickAll(pool), { used: new Set() }).stops.filter((x) => x.kind === 'visit')).toHaveLength(2);
  });
});
