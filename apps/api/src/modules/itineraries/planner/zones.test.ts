import { describe, expect, it } from 'vitest';
import { fakeRequest, placesIn, planInput, SEASON_GIA_LAP, ZONES } from '../../../testing/planner-fixtures';
import { prepare } from './plan-context';
import { planFromScratch, zoneOptions, type DraftPlan } from './zones';

const zoneIndex = (id: string) => ZONES.findIndex((z) => z.id === id);
const zonesOf = (r: DraftPlan) => (r.ok ? r.days.map((d) => d.zoneIds.map(zoneIndex)) : null);

describe('zoneOptions', () => {
  it('cụm đơn theo thứ tự dữ liệu rồi các cặp kề hai chiều, không có Bắc–Đông', () => {
    expect(zoneOptions(ZONES).map((o) => o.zoneIds.map(zoneIndex))).toEqual([[0], [1], [2], [3], [0, 1], [0, 2], [0, 3], [1, 3]]);
  });
  it('bỏ cặp chỉ kề một chiều', () => {
    const oneWay = ZONES.map((z, i) => (i === 1 ? { ...z, adjacentZones: [] } : z));
    expect(zoneOptions(oneWay).map((o) => o.zoneIds.map(zoneIndex))).toEqual([[0], [1], [2], [3], [0, 2], [0, 3]]);
  });
});

describe('planFromScratch', () => {
  it('4 ngày đầu không lặp cụm, mỗi ngày đủ 4 điểm', () => {
    const r = planFromScratch(prepare(planInput({ request: fakeRequest({ days: 4 }), places: [0, 1, 2, 3].flatMap((z) => placesIn(z, 5, z * 10)) })));
    expect(new Set(zonesOf(r)?.flat()).size).toBe(4);
    expect(r.ok && r.days.every((d) => d.picks.length === 4)).toBe(true);
  });
  it('ít điểm thì ghép cụm kề', () => {
    expect(zonesOf(planFromScratch(prepare(planInput({ places: [...placesIn(0, 2, 0), ...placesIn(1, 2, 10)] }))))).toEqual([[0, 1]]);
  });
  it('không ghép cặp cấm Bắc–Đông dù cả hai thiếu điểm', () => {
    expect(planFromScratch(prepare(planInput({ places: [...placesIn(2, 2, 0), ...placesIn(3, 2, 10)] }))).ok).toBe(false);
  });
  it('chọn cụm có tổng điểm cao hơn', () => {
    const chill = planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...placesIn(0, 4, 0), ...placesIn(1, 4, 10, { tags: ['chill'] })] });
    expect(zonesOf(planFromScratch(prepare(chill)))).toEqual([[1]]);
  });
  it('mọi điểm số bằng 0 (chưa có số liệu, không gu): một cụm, cụm đầu tiên trong dữ liệu', () => {
    expect(zonesOf(planFromScratch(prepare(planInput({ places: [0, 1, 2, 3].flatMap((z) => placesIn(z, 4, z * 10)) }))))).toEqual([[0]]);
  });
  it('gu chỉ cộng điểm: không điểm nào hợp gu vẫn đủ ngày', () => {
    const r = planFromScratch(prepare(planInput({ request: fakeRequest({ tags: ['nature_adventure'] }), places: placesIn(0, 4, 0) })));
    expect(r.ok && r.days[0]?.picks.length).toBe(4);
  });
  it('ngày 5 thong thả, chỉ cà phê/mua sắm/đặc sản, dùng lại cụm, không lặp điểm', () => {
    const places = [0, 1, 2, 3].flatMap((z) => [...placesIn(z, 6, z * 20), ...placesIn(z, 5, z * 20 + 10, { category: 'cafe' })]);
    const popularity = new Map(places.filter((p) => p.category === 'attraction').map((p) => [p.id, 10]));
    const r = planFromScratch(prepare(planInput({ request: fakeRequest({ days: 5, pace: 'packed' }), places, popularity })));
    const ids = r.ok ? r.days.flatMap((d) => d.picks.map((p) => p.place.id)) : [];
    expect(ids).toHaveLength(4 * 6 + 4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.ok && r.days[4]?.picks.every((p) => p.place.category === 'cafe')).toBe(true);
  });
  it('mùa mưa ưu tiên điểm có mái che', () => {
    const places = [...placesIn(0, 4, 0, { cover: 'none' }), ...placesIn(0, 4, 10, { cover: 'full' })];
    const seasons = [{ ...SEASON_GIA_LAP, kind: 'rain' as const, from: '11-01', to: '11-30' }];
    const covers = (startDate: string) => {
      const r = planFromScratch(prepare(planInput({ request: fakeRequest({ startDate }), places, seasons })));
      return r.ok ? r.days[0]?.picks.map((p) => p.place.cover) : [];
    };
    expect(covers('2026-11-23')).toEqual(['full', 'full', 'full', 'full']);
    expect(covers('2026-12-07')).toEqual(['none', 'none', 'none', 'none']);
  });
  it('thiếu điểm: báo cụm và số điểm tìm được', () => {
    expect(planFromScratch(prepare(planInput({ places: placesIn(0, 1, 0) })))).toEqual({
      ok: false, shortages: [{ day: 1, zoneSlugs: [ZONES[0]!.slug], available: 1 }],
    });
  });
  it('thành phố ít cụm hơn số ngày: ngày không còn cụm báo zoneSlugs rỗng', () => {
    const lastSlug = ZONES[3]!.slug;
    const zones = ZONES.slice(0, 3).map((z) => ({ ...z, adjacentZones: z.adjacentZones.filter((s) => s !== lastSlug) }));
    const r = planFromScratch(prepare(planInput({ request: fakeRequest({ days: 4 }), zones, places: [0, 1, 2].flatMap((z) => placesIn(z, 4, z * 10)) })));
    expect(r).toEqual({ ok: false, shortages: [{ day: 4, zoneSlugs: [], available: 0 }] });
  });
});
