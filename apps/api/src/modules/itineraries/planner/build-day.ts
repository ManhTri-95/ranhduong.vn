import { servesCategory, type DaySchedule, type GeoPoint, type MealKind } from '@ranhduong/contracts';
import { insertMeals } from './meals';
import { MIN_VISITS_PER_DAY, type DayPool } from './plan-context';
import { exactTravel, reversedMiddle, routeCost, routeDay } from './route';
import { byScore, EPS } from './scoring';
import { repairHours, timeStops, toDayStop, type DayStop } from './timing';
import type { DayPick } from './zones';

/** Ngày mưa: buổi chiều ưu tiên điểm trú mưa được (technical-design mục 7, mô hình thời gian). */
export const RAIN_AFTERNOON = { start: 780, end: 1020 } as const;
const COVER_WEIGHT = { full: 2, partial: 1, none: 0 } as const;

/** Phút ở điểm có mái che trong buổi chiều mưa: che hết ×2, che một phần ×1. */
export function rainCoverMinutes(stops: readonly DayStop[], times: DaySchedule): number {
  return stops.reduce((sum, stop, i) => {
    const t = times.stops[i];
    if (!t || stop.kind !== 'visit' || !stop.place.cover) return sum;
    const overlap = Math.max(0, Math.min(t.end, RAIN_AFTERNOON.end) - Math.max(t.start, RAIN_AFTERNOON.start));
    return sum + overlap * COVER_WEIGHT[stop.place.cover];
  }, 0);
}

export interface BuiltDay {
  stops: DayStop[];
  times: DaySchedule;
  missingMeals: MealKind[];
}

/** Ngày mưa chọn chiều đi đặt điểm có mái che vào buổi chiều, khi chiều đó không làm tuyến dài hơn. */
function preferRainCover(order: DayStop[], weekday: number, stay?: GeoPoint): DayStop[] {
  const reversed = reversedMiddle(order);
  if (routeCost(reversed, exactTravel, stay) > routeCost(order, exactTravel, stay) + EPS) return order;
  return rainCoverMinutes(reversed, timeStops(reversed, weekday)) > rainCoverMinutes(order, timeStops(order, weekday)) ? reversed : order;
}

/**
 * Sắp tuyến, xếp giờ và chèn bữa cho một ngày (technical-design mục 7 bước 7–9): sửa sai giờ mở cửa, ngày kết thúc
 * sau 21:30 thì bỏ điểm điểm số thấp nhất rồi làm lại. Còn dưới 3 điểm tham quan thì trả về để báo thiếu điểm.
 */
export function buildDay(pool: DayPool, pick: DayPick, options: { stay?: GeoPoint; used: ReadonlySet<string> }): BuiltDay {
  const weekday = pool.trip.weekday;
  let order = routeDay(pick.picks.flatMap((scored) => toDayStop(scored, 'visit') ?? []), exactTravel, options.stay);
  if (pool.rainy) order = preferRainCover(order, weekday, options.stay);
  const foods = [...pool.scored.values()].filter(({ place }) => servesCategory(place, 'food')).sort(byScore);
  for (;;) {
    order = repairHours(order, weekday);
    if (order.length < MIN_VISITS_PER_DAY) return { stops: order, times: timeStops(order, weekday), missingMeals: [] };
    const { stops, missing } = insertMeals(order, foods, weekday, options.used);
    const times = timeStops(stops, weekday);
    if (!times.lateFinish) return { stops, times, missingMeals: missing };
    const worst = [...order].sort(byScore).at(-1)!;
    order = order.filter((stop) => stop !== worst);
  }
}
