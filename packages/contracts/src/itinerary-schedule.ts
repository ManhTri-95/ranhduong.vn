import type { GeoPoint } from './geojson.js';
import type { StopKind } from './itinerary.js';
import type { TemplateAnalysis, TemplateEditInput, TemplateIssue, TemplatePlace } from './itinerary-admin.js';
import { MEAL_WINDOWS } from './itinerary-meals.js';
import { verificationStale } from './place.js';

/** 'HH:mm' → phút từ 00:00. */
export const clockMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** Phút từ 00:00 → 'HH:mm'. */
export const formatClock = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;

/** Ngày kết thúc sau 21:30 thì nhắc (S15) hoặc bỏ bớt điểm (S35). */
export const DAY_END_MIN = 1290;
export type MealKind = (typeof MEAL_WINDOWS)[number]['kind'];

/** The complete [arrival, departure) must be covered; adjoining intervals can be merged. */
export function coversVisit(place: Pick<TemplatePlace, 'openingHours'>, weekday: number, start: number, end: number): boolean {
  const ranges: [number, number][] = [];
  for (const offset of [-1, 0]) {
    for (const slot of place.openingHours.filter((s) => s.day === (weekday + offset + 7) % 7)) {
      const open = clockMinutes(slot.open);
      const close = clockMinutes(slot.close);
      if (open === close) continue;
      ranges.push([offset * 1440 + open, offset * 1440 + close + (close < open ? 1440 : 0)]);
    }
  }
  let covered = start;
  for (const [open, close] of ranges.sort((a, b) => a[0] - b[0])) {
    if (open > covered) break;
    if (close > covered) covered = close;
    if (covered >= end) return true;
  }
  return false;
}

export interface ScheduleStop {
  placeId: string;
  kind: StopKind;
  durationMin?: number;
  manualStart?: string;
  manualEnd?: string;
  /** Phút từ 00:00: không bắt đầu trước giờ này (bữa ăn chờ tới khung giờ ăn). */
  notBefore?: number;
  /** Chờ quán mở tối đa bấy nhiêu phút; mặc định 0 (S15 không chờ). */
  maxWaitMin?: number;
  /** Phút từ 00:00: quán mở trước hoặc đúng giờ này thì chờ được, dù quá maxWaitMin (ngày bắt đầu sớm). */
  waitUntil?: number;
}

export interface ScheduledTimes {
  /** Giờ tới nơi: điểm trước kết thúc cộng thời gian di chuyển. */
  arrival: number;
  start: number;
  end: number;
  travelMinFromPrev: number;
  /** Mở suốt [start, end) vào thứ của ngày; false khi thiếu địa điểm. */
  withinHours: boolean;
}

export interface DaySchedule {
  stops: ScheduledTimes[];
  missingMeals: MealKind[];
  lateFinish: boolean;
}

export interface ScheduleDayOptions {
  startTime: string;
  weekday: number;
  places: ReadonlyMap<string, TemplatePlace>;
  travel: (from: GeoPoint, to: GeoPoint) => number;
}

/** Giờ mở sớm nhất sau `base` (trong giới hạn chờ) phủ hết lượt ghé; không có thì `base`. */
function waitForOpening(place: TemplatePlace, weekday: number, base: number, duration: number, maxWaitMin: number, waitUntil: number): number {
  const openings = place.openingHours
    .filter((slot) => slot.day === weekday && slot.open !== slot.close)
    .map((slot) => clockMinutes(slot.open))
    .filter((open) => open > base && (open <= base + maxWaitMin || open <= waitUntil))
    .sort((a, b) => a - b);
  return openings.find((open) => coversVisit(place, weekday, open, open + duration)) ?? base;
}

/** Xếp giờ một ngày theo thứ tự cho sẵn; hàm chung của kiểm tra mẫu (S15) và thuật toán lịch trình (S35). */
export function scheduleDay(stops: readonly ScheduleStop[], options: ScheduleDayOptions): DaySchedule {
  const { weekday, places, travel } = options;
  let cursor = clockMinutes(options.startTime);
  let previous: TemplatePlace | undefined;
  const times = stops.map((stop): ScheduledTimes => {
    const place = places.get(stop.placeId);
    const travelMinFromPrev = previous?.location && place?.location ? travel(previous.location, place.location) : 0;
    const arrival = cursor + travelMinFromPrev;
    const duration = stop.durationMin ?? place?.visitDurationMin ?? 60;
    let start = stop.manualStart ? clockMinutes(stop.manualStart) : Math.max(arrival, stop.notBefore ?? arrival);
    if (!stop.manualStart && place && !coversVisit(place, weekday, start, start + duration)) {
      start = waitForOpening(place, weekday, start, duration, stop.maxWaitMin ?? 0, stop.waitUntil ?? -1);
    }
    const end = stop.manualEnd ? clockMinutes(stop.manualEnd) : start + duration;
    cursor = end;
    previous = place;
    return { arrival, start, end, travelMinFromPrev, withinHours: place ? coversVisit(place, weekday, start, end) : false };
  });
  const missingMeals: MealKind[] = [];
  const first = times[0];
  const last = times.at(-1);
  if (first && last) {
    for (const { kind, start, end } of MEAL_WINDOWS) {
      const covered = times.some((slot, i) => stops[i]?.kind === 'meal' && slot.start < end && slot.end > start);
      if (first.start < end && last.end > start && !covered) missingMeals.push(kind);
    }
  }
  return { stops: times, missingMeals, lateFinish: last !== undefined && last.end > DAY_END_MIN };
}

export function analyzeTemplate(input: TemplateEditInput, candidates: readonly TemplatePlace[], travel: (from: GeoPoint, to: GeoPoint) => number, now = new Date()): TemplateAnalysis {
  const places = new Map(candidates.map((p) => [p.id, p]));
  const issues: TemplateIssue[] = [];
  const days = input.days.map((day, index) => {
    const weekday = (input.startWeekday + index) % 7;
    const issue = (code: TemplateIssue['code'], level: TemplateIssue['level'], message: string, stopKey?: string) => issues.push({ code, level, day: index, message, stopKey });
    if (!day.stops.length) issue('empty_day', 'error', 'Ngày này chưa có địa điểm');
    const schedule = scheduleDay(day.stops, { startTime: day.startTime, weekday, places, travel });
    const stops = day.stops.map((stop, i) => {
      const { arrival, start, end, travelMinFromPrev, withinHours } = schedule.stops[i]!;
      const place = places.get(stop.placeId);
      if (start < clockMinutes(day.startTime) || end <= start || start >= 1440 || end > 1440) issue('invalid_time', 'error', 'Giờ đến/đi phải theo thứ tự và nằm trong ngày', stop.key);
      if (start < arrival) issue('overlap', 'error', 'Giờ đến chồng với điểm trước hoặc chưa đủ thời gian di chuyển', stop.key);
      if (!place) issue('missing_place', 'error', 'Địa điểm không còn tồn tại trong thành phố này', stop.key);
      else {
        if (['suspected', 'hidden', 'closed', 'merged'].includes(place.status)) issue('unavailable', 'error', 'Địa điểm đang bị nghi ngờ, ẩn, đã đóng hoặc đã gộp', stop.key);
        if (!place.location) issue('location_missing', 'error', 'Địa điểm chưa có toạ độ để tính di chuyển', stop.key);
        if (!withinHours) issue('outside_hours', 'error', 'Giờ ghé nằm ngoài giờ mở cửa vào ngày này', stop.key);
        if (place.status === 'draft') issue('draft_place', 'warning', 'Địa điểm còn là nháp', stop.key);
        if (verificationStale(place.lastVerifiedAt, now)) issue('stale_verification', 'warning', 'Địa điểm quá 90 ngày chưa xác minh hoặc chưa được xác minh', stop.key);
        if (!place.validPhoto) issue('missing_photo', 'warning', 'Địa điểm chưa có ảnh hợp lệ', stop.key);
      }
      return { ...stop, start: formatClock(start), end: formatClock(end), travelMinFromPrev };
    });
    for (const { kind, label } of MEAL_WINDOWS) {
      if (schedule.missingMeals.includes(kind)) issue(`missing_${kind}`, 'warning', `Lịch trình đi qua khung giờ nhưng thiếu ${label}`);
    }
    if (schedule.lateFinish) issue('late_finish', 'warning', 'Ngày kết thúc sau 21:30');
    return { day: index + 1, weekday, startTime: day.startTime, stops };
  });
  return { days, issues, canPublish: !issues.some((issue) => issue.level === 'error') };
}
