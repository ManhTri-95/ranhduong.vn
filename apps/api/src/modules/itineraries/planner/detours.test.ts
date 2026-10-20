import type { GeoPoint, ItineraryPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { allDays, fakePlace } from '../../../testing/planner-fixtures';
import { suggestDetours } from './detours';
import { timeStops, toDayStop } from './timing';

const pt = (x: number, y: number): GeoPoint => ({ type: 'Point', coordinates: [x, y] });
const stopAt = (n: number, location: GeoPoint) => toDayStop({ place: fakePlace(n, { location }), score: 0, match: 0 }, 'visit')!;
const cand = (n: number, location: GeoPoint, score = 0, overrides: Partial<ItineraryPlace> = {}) => ({ place: fakePlace(n, { location, ...overrides }), score, match: 0 });
// A → B khoảng 7,5 phút; Thứ Hai.
const A = stopAt(1, pt(0.1, 0.1));
const B = stopAt(2, pt(0.12, 0.1));
const t = timeStops([A, B], 1);

describe('S35 suggestDetours', () => {
  it('gợi ý điểm đi vòng ít nhất, dưới 10 phút', () => {
    const pool = [cand(10, pt(0.11, 0.105), 0.9), cand(11, pt(0.11, 0.1), 0.1)];
    expect(suggestDetours([A, B], t, pool, 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(11).id, detourMin: 0 }]);
    expect(suggestDetours([A, B], t, [pool[0]!], 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(10).id, detourMin: 1 }]);
  });

  it('không gợi ý khi đi vòng từ 10 phút', () => {
    expect(suggestDetours([A, B], t, [cand(12, pt(0.11, 0.13))], 1, new Set())).toEqual([]);
  });

  it('số phút hiển thị luôn dưới 10: đi vòng 9,5–10 phút thì không gợi ý', () => {
    // pt(0.11, 0.1205) đi vòng khoảng 9,57 phút, làm tròn thành 10.
    expect(suggestDetours([A, B], t, [cand(14, pt(0.11, 0.1205))], 1, new Set())).toEqual([]);
    expect(suggestDetours([A, B], t, [cand(15, pt(0.11, 0.12))], 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(15).id, detourMin: 9 }]);
  });

  it('bỏ điểm đã có trong chuyến hoặc đóng cửa lúc ghé', () => {
    const near = cand(10, pt(0.11, 0.105));
    expect(suggestDetours([A, B], t, [cand(11, pt(0.11, 0.1)), near], 1, new Set([fakePlace(11).id]))[0]?.placeId).toBe(near.place.id);
    const closed = cand(11, pt(0.11, 0.1), 0, { openingHours: allDays('07:00', '07:30') });
    expect(suggestDetours([A, B], t, [closed, near], 1, new Set())[0]?.placeId).toBe(near.place.id);
  });

  it('mỗi điểm chỉ gợi ý một lần; một điểm dừng thì không có gợi ý', () => {
    const C = stopAt(3, pt(0.14, 0.1));
    expect(suggestDetours([A, B, C], timeStops([A, B, C], 1), [cand(13, pt(0.12, 0.1))], 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(13).id, detourMin: 0 }]);
    expect(suggestDetours([A], timeStops([A], 1), [cand(13, pt(0.12, 0.1))], 1, new Set())).toEqual([]);
  });
});
