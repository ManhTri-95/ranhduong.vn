import { formatClock, NotEnoughPlacesDetails, type ItineraryPace, type MealKind, type PlanShortage, type StopKind } from '@ranhduong/contracts';
import { buildDay, type BuiltDay } from './build-day';
import { suggestDetours, type DetourSuggestion } from './detours';
import { MIN_VISITS_PER_DAY, type PlanInput } from './plan-context';
import { draftPlan, suggestFor } from './plan-itinerary';
import { dayStartTime } from './timing';

/** Điểm dừng đã xếp giờ; S37 gắn `key`, `note`, `locked`, `isVip` khi lưu. */
export interface ScheduledStop {
  placeId: string;
  kind: StopKind;
  /** 'HH:mm' giờ Việt Nam. */
  start: string;
  end: string;
  travelMinFromPrev: number;
}

export interface ScheduledDay {
  day: number;
  /** 'YYYY-MM-DD' giờ Việt Nam. */
  date: string;
  weekday: number;
  rainy: boolean;
  pace: ItineraryPace;
  zoneIds: string[];
  startTime: string;
  stops: ScheduledStop[];
  /** Gợi ý tuỳ chọn theo chỉ số điểm dừng; S37 đổi `afterIndex` thành `afterKey`. */
  detours: DetourSuggestion[];
  /** Ngày đi qua khung giờ ăn nhưng không chèn được quán hợp lệ; S36 tính là lỗi độ phủ. */
  issues: `missing_${MealKind}`[];
}

export type GenerateResult =
  | { ok: true; templateId?: string; days: ScheduledDay[] }
  | { ok: false; code: 'NOT_ENOUGH_PLACES'; details: NotEnoughPlacesDetails };

type Attempt = { ok: true; templateId?: string; days: ScheduledDay[] } | { ok: false; shortages: PlanShortage[] };

function attempt(input: PlanInput): Attempt {
  const { ctx, result } = draftPlan(input);
  if (!result.ok) return result;
  const used = new Set(result.days.flatMap((day) => day.picks.map(({ place }) => place.id)));
  const built: BuiltDay[] = ctx.days.map((pool, i) => {
    const day = buildDay(pool, result.days[i] ?? { zoneIds: [], picks: [] }, { stay: input.request.stayLocation, used });
    for (const stop of day.stops) used.add(stop.place.id);
    return day;
  });
  const slugOf = new Map(ctx.zones.map((zone) => [zone.id, zone.slug]));
  const shortages = built.flatMap((day, i): PlanShortage[] => {
    const available = day.stops.filter((stop) => stop.kind === 'visit').length;
    if (available >= MIN_VISITS_PER_DAY) return [];
    return [{ day: ctx.days[i]!.trip.day, zoneSlugs: (result.days[i]?.zoneIds ?? []).flatMap((id) => slugOf.get(id) ?? []), available }];
  });
  if (shortages.length > 0) return { ok: false, shortages };
  // Tiện đường tính sau khi đủ mọi ngày để không gợi ý điểm hay quán của ngày sau.
  const excluded = new Set(built.flatMap((day) => day.stops.map((stop) => stop.place.id)));
  const days = ctx.days.map((pool, i): ScheduledDay => {
    const { stops, times, missingMeals } = built[i]!;
    const detours = suggestDetours(stops, times, pool.visits, pool.trip.weekday, excluded);
    for (const detour of detours) excluded.add(detour.placeId);
    return {
      day: pool.trip.day, date: pool.trip.date, weekday: pool.trip.weekday, rainy: pool.rainy, pace: pool.pace,
      zoneIds: result.days[i]?.zoneIds ?? [], startTime: dayStartTime(stops),
      stops: stops.map((stop, j) => {
        const t = times.stops[j]!;
        return { placeId: stop.place.id, kind: stop.kind, start: formatClock(t.start), end: formatClock(t.end), travelMinFromPrev: t.travelMinFromPrev };
      }),
      detours, issues: missingMeals.map((kind) => `missing_${kind}` as const),
    };
  });
  return { ok: true, ...(result.templateId ? { templateId: result.templateId } : {}), days };
}

/**
 * Tạo lịch trình của khách (S34 chọn điểm, S35 sắp tuyến, xếp giờ, chèn bữa, gợi ý tiện đường). Hàm thuần; nơi ở chỉ
 * dùng để sắp tuyến, không có trong kết quả. Thiếu điểm thì trả NOT_ENOUGH_PLACES, gợi ý đã chạy thử cả quy trình.
 */
export function generateItinerary(input: PlanInput): GenerateResult {
  const result = attempt(input);
  if (result.ok) return result;
  const suggestions = suggestFor(input, (retry) => attempt(retry).ok);
  return { ok: false, code: 'NOT_ENOUGH_PLACES', details: NotEnoughPlacesDetails.parse({ shortages: result.shortages, suggestions }) };
}
