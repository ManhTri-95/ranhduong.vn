import { MEAL_WINDOWS, type ItineraryPlace, type MealKind } from '@ranhduong/contracts';
import { exactTravel } from './route';
import { EPS, type ScoredPlace } from './scoring';
import { timeStops, toDayStop, type DayStop } from './timing';

/** Điểm tham quan chưa có mức giá tính như mức này khi tìm mặt bằng giá của ngày (chủ dự án chọn 20/10/2026). */
export const DEFAULT_PRICE_LEVEL = 2;

/** Mức giá cao nhất của các điểm tham quan trong ngày; quán ăn không quá mức này là "đúng mức giá". */
export function dayPriceCap(visits: readonly Pick<ItineraryPlace, 'priceLevel'>[]): number {
  if (visits.length === 0) return DEFAULT_PRICE_LEVEL;
  return Math.max(...visits.map((visit) => visit.priceLevel ?? DEFAULT_PRICE_LEVEL));
}

interface MealOption {
  stops: DayStop[];
  /** Đi vòng cộng phút chờ tới giờ ăn, làm tròn 5 phút. */
  added: number;
  fits: boolean;
  score: number;
  id: string;
}

/** Thêm ít thời gian hơn, rồi đúng mức giá, điểm số cao hơn, id nhỏ hơn; bằng hết thì giữ phương án gặp trước. */
function better(a: MealOption, b: MealOption | undefined): boolean {
  if (!b) return true;
  if (a.added !== b.added) return a.added < b.added;
  if (a.fits !== b.fits) return a.fits;
  if (Math.abs(a.score - b.score) > EPS) return a.score > b.score;
  return a.id < b.id;
}

/**
 * Chèn bữa trưa, bữa tối (technical-design mục 7 bước 9) khi ngày đi qua khung giờ ăn: quán phục vụ ăn uống chưa có
 * trong chuyến, bắt đầu trong khung, mọi điểm vẫn trong giờ mở cửa; không chèn sau điểm ghim cuối.
 */
export function insertMeals(stops: readonly DayStop[], foods: readonly ScoredPlace[], weekday: number, used: ReadonlySet<string>): { stops: DayStop[]; missing: MealKind[] } {
  let current = [...stops];
  const missing: MealKind[] = [];
  for (const window of MEAL_WINDOWS) {
    const times = timeStops(current, weekday).stops;
    const first = times[0];
    const last = times.at(-1);
    if (!first || !last || first.start >= window.end || last.end <= window.start) continue;
    const cap = dayPriceCap(current.filter((stop) => stop.kind === 'visit').map((stop) => stop.place));
    const inDay = new Set(current.map((stop) => stop.place.id));
    const lastPin = current.findIndex((stop) => stop.pin === 'last');
    const maxPos = lastPin === -1 ? current.length : lastPin;
    let best: MealOption | undefined;
    for (const food of foods) {
      if (used.has(food.place.id) || inDay.has(food.place.id)) continue;
      const meal = toDayStop(food, 'meal');
      if (!meal) continue;
      meal.notBefore = window.start;
      for (let pos = 1; pos <= maxPos; pos++) {
        const candidate = [...current.slice(0, pos), meal, ...current.slice(pos)];
        const schedule = timeStops(candidate, weekday).stops;
        const slot = schedule[pos]!;
        if (slot.start >= window.end || !schedule.every((t) => t.withinHours)) continue;
        const a = current[pos - 1]!;
        const b = current[pos];
        const detour = exactTravel(a.location, meal.location) + (b ? exactTravel(meal.location, b.location) - exactTravel(a.location, b.location) : 0);
        const option: MealOption = {
          stops: candidate, added: Math.round((detour + slot.start - slot.arrival) / 5) * 5,
          fits: food.place.priceLevel === undefined || food.place.priceLevel <= cap, score: food.score, id: food.place.id,
        };
        if (better(option, best)) best = option;
      }
    }
    if (best) current = best.stops;
    else missing.push(window.kind);
  }
  return { stops: current, missing };
}
