import type { GeoPoint } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { exactTravel, reversedMiddle, routeCost, routeDay, type RouteStop } from './route';
import { EPS } from './scoring';

// Toạ độ giả quanh [0.1, 0.1]; mỗi đơn vị x, y là 0,01°.
const at = (x: number, y = 0): GeoPoint => ({ type: 'Point', coordinates: [0.1 + x / 100, 0.1 + y / 100] });
type Stop = RouteStop & { id: string };
const s = (id: string, x: number, pin?: 'first' | 'last', y = 0): Stop => ({ id, location: at(x, y), ...(pin ? { pin } : {}) });
const ids = (route: readonly Stop[]) => route.map((stop) => stop.id);

describe('S35 routeDay', () => {
  it('NN từ nơi ở rồi 2-opt', () => {
    expect(ids(routeDay([s('c', 3), s('a', 1), s('d', 4), s('b', 2)], exactTravel, at(0)))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('không có nơi ở: tuyến mở từ điểm đầu danh sách, 2-opt được đổi đầu tuyến', () => {
    expect(ids(routeDay([s('b', 2), s('a', 1.4), s('c', 3), s('d', 4)], exactTravel))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ghim đầu, ghim cuối giữ chỗ; NN bắt đầu từ ghim đầu', () => {
    expect(ids(routeDay([s('m1', 1), s('s', 5, 'first'), s('m2', 2), s('e', 0, 'last')], exactTravel, at(0)))).toEqual(['s', 'm2', 'm1', 'e']);
  });

  it('nơi ở: tính cả chặng về', () => {
    expect(routeCost([s('a', 1)], exactTravel, at(0))).toBeCloseTo(2 * exactTravel(at(0), at(1)));
    expect(routeCost([s('a', 1), s('b', 2)], exactTravel)).toBeCloseTo(exactTravel(at(1), at(2)));
  });

  it('điểm trùng toạ độ: dừng, giữ thứ tự', () => {
    const same = [s('a', 1), s('b', 1), s('c', 1)];
    expect(ids(routeDay(same, exactTravel))).toEqual(['a', 'b', 'c']);
    expect(ids(routeDay(same, exactTravel, at(1)))).toEqual(['a', 'b', 'c']);
  });

  it('reversedMiddle giữ ghim', () => {
    expect(ids(reversedMiddle([s('s', 0, 'first'), s('a', 1), s('b', 2), s('e', 3, 'last')]))).toEqual(['s', 'b', 'a', 'e']);
    expect(ids(reversedMiddle([s('a', 1), s('b', 2), s('c', 3)]))).toEqual(['c', 'b', 'a']);
  });

  it('bất biến: hoán vị đầu vào, ghim đúng chỗ, không còn phép đảo nào giảm chi phí', () => {
    let seed = 35;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let round = 0; round < 200; round++) {
      const count = 2 + Math.floor(rand() * 5);
      const stops = Array.from({ length: count }, (_, i) => s(`p${i}`, rand() * 5, undefined, rand() * 5));
      if (rand() < 0.4) stops[0] = { ...stops[0]!, pin: 'first' };
      if (rand() < 0.4) stops[count - 1] = { ...stops[count - 1]!, pin: 'last' };
      const shuffled = [...stops].sort(() => rand() - 0.5);
      const stay = rand() < 0.5 ? at(rand() * 5, rand() * 5) : undefined;
      const route = routeDay(shuffled, exactTravel, stay);

      expect([...ids(route)].sort()).toEqual([...ids(stops)].sort());
      const first = stops.find((stop) => stop.pin === 'first');
      const last = stops.find((stop) => stop.pin === 'last');
      if (first) expect(route[0]?.id).toBe(first.id);
      if (last) expect(route.at(-1)?.id).toBe(last.id);
      const from = first ? 1 : 0;
      const to = route.length - (last ? 1 : 0);
      const best = routeCost(route, exactTravel, stay);
      for (let i = from; i < to; i++) {
        for (let j = i + 1; j < to; j++) {
          const flipped = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
          expect(routeCost(flipped, exactTravel, stay)).toBeGreaterThanOrEqual(best - EPS);
        }
      }
    }
  });
});
