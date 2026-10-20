import { coversVisit, type DaySchedule } from '@ranhduong/contracts';
import { exactTravel } from './route';
import { EPS, type ScoredPlace } from './scoring';
import { legMinutes, type DayStop } from './timing';

/** Điểm đi vòng dưới bấy nhiêu phút là "Tiện đường" (product-spec mục 8). */
export const DETOUR_MAX_MIN = 10;

/** Gợi ý tuỳ chọn ghé thêm sau điểm dừng thứ `afterIndex`; S37 đổi chỉ số thành `afterKey`. */
export interface DetourSuggestion {
  afterIndex: number;
  placeId: string;
  detourMin: number;
}

/**
 * Điểm tiện đường (technical-design mục 7 bước 10): mỗi cặp điểm liên tiếp tối đa một gợi ý, điểm đi vòng ít nhất
 * (hoà thì theo thứ tự `pool`), chưa có trong chuyến, chưa gợi ý ở chỗ khác, mở suốt lượt ghé nếu ghé ngay sau điểm trước.
 */
export function suggestDetours(stops: readonly DayStop[], times: DaySchedule, pool: readonly ScoredPlace[], weekday: number, excluded: ReadonlySet<string>): DetourSuggestion[] {
  const taken = new Set(excluded);
  const suggestions: DetourSuggestion[] = [];
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    const leaveAt = times.stops[i]!.end;
    let best: { placeId: string; detour: number } | undefined;
    for (const { place } of pool) {
      if (!place.location || taken.has(place.id)) continue;
      const detour = exactTravel(a.location, place.location) + exactTravel(place.location, b.location) - exactTravel(a.location, b.location);
      if (detour >= DETOUR_MAX_MIN || (best && detour >= best.detour - EPS)) continue;
      const arrival = leaveAt + legMinutes(a.location, place.location);
      if (!coversVisit(place, weekday, arrival, arrival + (place.visitDurationMin ?? 60))) continue;
      best = { placeId: place.id, detour };
    }
    if (best) {
      taken.add(best.placeId);
      suggestions.push({ afterIndex: i, placeId: best.placeId, detourMin: Math.max(0, Math.round(best.detour)) });
    }
  }
  return suggestions;
}
