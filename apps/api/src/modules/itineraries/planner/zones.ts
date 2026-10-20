import type { ItineraryZone, PlanShortage } from '@ranhduong/contracts';
import { LEISURE_DAY, MIN_VISITS_PER_DAY, type PlanContext } from './plan-context';
import { EPS, pickVisits, type ScoredPlace } from './scoring';

/** Một hoặc hai cụm cho một ngày. */
export interface ZoneOption {
  zoneIds: string[];
  slugs: string[];
}

/** Cụm đơn theo thứ tự dữ liệu, rồi cặp mà hai cụm liệt kê nhau trong adjacentZones (đã trừ cặp cấm). */
export function zoneOptions(zones: readonly ItineraryZone[]): ZoneOption[] {
  const pairs: ZoneOption[] = [];
  zones.forEach((a, i) => zones.slice(i + 1).forEach((b) => {
    if (a.adjacentZones.includes(b.slug) && b.adjacentZones.includes(a.slug)) pairs.push({ zoneIds: [a.id, b.id], slugs: [a.slug, b.slug] });
  }));
  return [...zones.map((zone) => ({ zoneIds: [zone.id], slugs: [zone.slug] })), ...pairs];
}

export interface DayPick {
  zoneIds: string[];
  picks: ScoredPlace[];
}

export type DraftPlan = { ok: true; days: DayPick[] } | { ok: false; shortages: PlanShortage[] };

type ChosenDay = DayPick & { slugs: string[] };
interface Leaf {
  days: ChosenDay[];
  feasible: number;
  picks: number;
  value: number;
  zones: number;
}

/** Thứ tự ưu tiên: số ngày đủ điểm, tổng số điểm chọn được, tổng điểm số, ít cụm hơn; hoà thì giữ lá gặp trước. */
function better(a: Leaf, b: Leaf | undefined): boolean {
  if (!b) return true;
  if (a.feasible !== b.feasible) return a.feasible > b.feasible;
  if (a.picks !== b.picks) return a.picks > b.picks;
  if (Math.abs(a.value - b.value) > EPS) return a.value > b.value;
  return a.zones < b.zones;
}

function toLeaf(days: ChosenDay[]): Leaf {
  return {
    days: [...days],
    feasible: days.filter((d) => d.picks.length >= MIN_VISITS_PER_DAY).length,
    picks: days.reduce((n, d) => n + d.picks.length, 0),
    value: days.reduce((sum, d) => sum + d.picks.reduce((s, p) => s + p.score, 0), 0),
    zones: days.reduce((n, d) => n + d.zoneIds.length, 0),
  };
}

/**
 * Gán cụm và chọn điểm khi không dùng mẫu (technical-design mục 7 bước 5–6): vét cạn mọi tổ hợp lựa chọn cụm.
 * Ngày 1–4 không lặp cụm, hết lựa chọn thì ngày đó không có cụm; ngày 5 dùng lại cụm. Không lặp điểm giữa các ngày.
 */
export function planFromScratch(ctx: PlanContext): DraftPlan {
  const options = zoneOptions(ctx.zones);
  const pools = ctx.days.map((day) => options.map((option) => day.visits.filter((v) => v.place.zoneId !== undefined && option.zoneIds.includes(v.place.zoneId))));
  const chosen: ChosenDay[] = [];
  let best: Leaf | undefined;

  const search = (i: number, usedZones: ReadonlySet<string>, usedPlaces: ReadonlySet<string>): void => {
    const day = ctx.days[i];
    if (!day) {
      const leaf = toLeaf(chosen);
      if (better(leaf, best)) best = leaf;
      return;
    }
    const reuseZones = day.trip.day === LEISURE_DAY;
    let tried = false;
    options.forEach((option, k) => {
      if (!reuseZones && option.zoneIds.some((id) => usedZones.has(id))) return;
      tried = true;
      const picks = pickVisits(pools[i]?.[k] ?? [], day.target, usedPlaces);
      chosen.push({ zoneIds: option.zoneIds, slugs: option.slugs, picks });
      search(i + 1, reuseZones ? usedZones : new Set([...usedZones, ...option.zoneIds]), new Set([...usedPlaces, ...picks.map((p) => p.place.id)]));
      chosen.pop();
    });
    if (!tried) {
      chosen.push({ zoneIds: [], slugs: [], picks: [] });
      search(i + 1, usedZones, usedPlaces);
      chosen.pop();
    }
  };
  search(0, new Set(), new Set());

  const days = best?.days ?? [];
  if (best && best.feasible === ctx.days.length) return { ok: true, days: days.map(({ zoneIds, picks }) => ({ zoneIds, picks })) };
  return {
    ok: false,
    shortages: days.flatMap((d, i) => (d.picks.length < MIN_VISITS_PER_DAY ? [{ day: i + 1, zoneSlugs: d.slugs, available: d.picks.length }] : [])),
  };
}
