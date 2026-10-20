import { NotEnoughPlacesDetails, type ItineraryPace, type PlanShortage, type PlanSuggestion } from '@ranhduong/contracts';
import { prepare, type DayPool, type PlanContext, type PlanInput } from './plan-context';
import { pinOf } from './scoring';
import { nearestTemplate, planFromTemplate } from './templates';
import { planFromScratch, type DayPick } from './zones';

export interface PlannedVisit {
  placeId: string;
  zoneId: string;
  score: number;
  /** S35 xếp điểm 'first' đầu ngày (bình minh, 04:45) và 'last' cuối ngày (buổi tối). */
  pin?: 'first' | 'last';
}

export interface PlannedDay {
  day: number;
  /** 'YYYY-MM-DD' giờ Việt Nam. */
  date: string;
  weekday: number;
  /** Ngày trong mùa mưa: S35 ưu tiên điểm có mái che buổi chiều. */
  rainy: boolean;
  pace: ItineraryPace;
  zoneIds: string[];
  /** Theo thứ tự chọn; S35 sắp tuyến, xếp giờ và chèn bữa ăn. */
  visits: PlannedVisit[];
}

export type PlanResult =
  | { ok: true; templateId?: string; days: PlannedDay[] }
  | { ok: false; code: 'NOT_ENOUGH_PLACES'; details: NotEnoughPlacesDetails };

type Draft = { ok: true; templateId?: string; days: DayPick[] } | { ok: false; shortages: PlanShortage[] };

/** Mẫu gần nhất trước; mẫu không đủ điểm thì tạo từ đầu. */
function draft(input: PlanInput): { ctx: PlanContext; result: Draft } {
  const ctx = prepare(input);
  const template = nearestTemplate(ctx.templates, ctx.request);
  if (template) {
    const fromTemplate = planFromTemplate(template, ctx);
    if (fromTemplate.ok) return { ctx, result: { ok: true, templateId: template.id, days: fromTemplate.days } };
  }
  return { ctx, result: planFromScratch(ctx) };
}

function toPlannedDay(pool: DayPool, pick: DayPick | undefined): PlannedDay {
  return {
    day: pool.trip.day, date: pool.trip.date, weekday: pool.trip.weekday, rainy: pool.rainy, pace: pool.pace,
    zoneIds: pick?.zoneIds ?? [],
    visits: (pick?.picks ?? []).flatMap(({ place, score }) => {
      const pin = pinOf(place);
      return place.zoneId ? [{ placeId: place.id, zoneId: place.zoneId, score, ...(pin ? { pin } : {}) }] : [];
    }),
  };
}

/**
 * Chọn cụm và điểm tham quan cho từng ngày (S34; technical-design mục 7 bước 2–6, 12). Hàm thuần: cùng đầu vào cho
 * cùng kết quả. Thiếu điểm thì trả NOT_ENOUGH_PLACES, chỉ kèm gợi ý đã chạy thử và tạo được.
 */
export function planItinerary(input: PlanInput): PlanResult {
  const { ctx, result } = draft(input);
  if (result.ok) {
    return { ok: true, ...(result.templateId ? { templateId: result.templateId } : {}), days: ctx.days.map((pool, i) => toPlannedDay(pool, result.days[i])) };
  }
  const suggestions: PlanSuggestion[] = [];
  const fewerDays = ([4, 3, 2, 1] as const).find((days) => days < input.request.days && draft({ ...input, request: { ...input.request, days } }).result.ok);
  if (fewerDays) suggestions.push({ kind: 'reduce_days', days: fewerDays });
  if (input.request.tags.length > 0 && draft({ ...input, request: { ...input.request, tags: [] } }).result.ok) suggestions.push({ kind: 'drop_interests' });
  return { ok: false, code: 'NOT_ENOUGH_PLACES', details: NotEnoughPlacesDetails.parse({ shortages: result.shortages, suggestions }) };
}
