import type { ItineraryRequest } from '@ranhduong/contracts';
import { MIN_VISITS_PER_DAY, type PlanContext, type PlanTemplate } from './plan-context';
import { byScore, EPS, hasPreferences, pickVisits, type ScoredPlace } from './scoring';
import type { DayPick } from './zones';

/** Cộng vào độ giống khi mẫu cùng "đi cùng ai" với khách (giá trị khởi đầu). */
export const WITH_MATCH_BONUS = 0.25;

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const right = new Set(b);
  const shared = new Set(a.filter((item) => right.has(item))).size;
  return shared / new Set([...a, ...b]).size;
}

/** Mẫu cùng số ngày giống khách nhất: Jaccard trên gu, cộng thêm khi cùng đi cùng ai; hoà thì id nhỏ hơn. */
export function nearestTemplate(templates: readonly PlanTemplate[], request: Pick<ItineraryRequest, 'days' | 'tags' | 'with'>): PlanTemplate | undefined {
  let best: PlanTemplate | undefined;
  let bestSimilarity = -Infinity;
  for (const template of [...templates].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (template.days.length !== request.days) continue;
    const similarity = jaccard(request.tags, template.tags) + (template.with === request.with ? WITH_MATCH_BONUS : 0);
    if (similarity > bestSimilarity + EPS) {
      best = template;
      bestSimilarity = similarity;
    }
  }
  return best;
}

/**
 * Lấy mẫu làm khung, chỉ thay điểm không hợp (technical-design mục 7 bước 2). Điểm ghé của mẫu còn hợp lệ và hợp gu
 * được giữ trước; điểm của mẫu không hợp gu cạnh tranh với ứng viên cùng cụm của ngày; điểm bữa ăn để S35 chèn.
 * Số điểm theo nhịp độ của khách. Ngày nào dưới MIN_VISITS_PER_DAY điểm thì bỏ mẫu.
 */
export function planFromTemplate(template: PlanTemplate, ctx: PlanContext): { ok: true; days: DayPick[] } | { ok: false } {
  if (template.days.length !== ctx.days.length) return { ok: false };
  const cityZones = new Set(ctx.zones.map((zone) => zone.id));
  const preferences = hasPreferences(ctx.request);
  const used = new Set<string>();
  const days: DayPick[] = [];
  for (const [i, day] of ctx.days.entries()) {
    const templatePlaces = (template.days[i]?.stops ?? []).flatMap((stop) => {
      const place = stop.kind === 'visit' ? ctx.places.get(stop.placeId) : undefined;
      return place ? [place] : [];
    });
    const dayZones = [...new Set(templatePlaces.flatMap((place) => (place.zoneId && cityZones.has(place.zoneId) ? [place.zoneId] : [])))];
    const kept = templatePlaces.flatMap((place) => day.scored.get(place.id) ?? []);
    const keptIds = new Set(kept.map((s) => s.place.id));
    const fixed = preferences ? kept.filter((s) => s.match > 0) : kept;
    const rest: ScoredPlace[] = [
      ...kept.filter((s) => !fixed.includes(s)),
      ...day.visits.filter((v) => !keptIds.has(v.place.id) && v.place.zoneId !== undefined && dayZones.includes(v.place.zoneId)),
    ];
    const picks = pickVisits([...[...fixed].sort(byScore), ...rest.sort(byScore)], day.target, used);
    if (picks.length < MIN_VISITS_PER_DAY) return { ok: false };
    picks.forEach((pick) => used.add(pick.place.id));
    days.push({ zoneIds: dayZones.filter((zoneId) => picks.some((pick) => pick.place.zoneId === zoneId)), picks });
  }
  return { ok: true, days };
}
