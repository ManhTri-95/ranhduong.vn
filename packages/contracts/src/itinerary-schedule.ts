import type { GeoPoint } from './geojson.js';
import type { TemplateAnalysis, TemplateEditInput, TemplateIssue, TemplatePlace } from './itinerary-admin.js';
import { verificationStale } from './place.js';

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const formatTime = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;

/** The complete [arrival, departure) must be covered; adjoining intervals can be merged. */
function coversVisit(place: TemplatePlace, weekday: number, start: number, end: number): boolean {
  const ranges: [number, number][] = [];
  for (const offset of [-1, 0]) {
    for (const slot of place.openingHours.filter((s) => s.day === (weekday + offset + 7) % 7)) {
      const open = minutes(slot.open);
      const close = minutes(slot.close);
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

export function analyzeTemplate(input: TemplateEditInput, candidates: readonly TemplatePlace[], travel: (from: GeoPoint, to: GeoPoint) => number, now = new Date()): TemplateAnalysis {
  const places = new Map(candidates.map((p) => [p.id, p]));
  const issues: TemplateIssue[] = [];
  const days = input.days.map((day, index) => {
    const weekday = (input.startWeekday + index) % 7;
    const issue = (code: TemplateIssue['code'], level: TemplateIssue['level'], message: string, stopKey?: string) => issues.push({ code, level, day: index, message, stopKey });
    if (!day.stops.length) issue('empty_day', 'error', 'Ngày này chưa có địa điểm');
    let cursor = minutes(day.startTime);
    let previous: TemplatePlace | undefined;
    const intervals: { start: number; end: number; meal: boolean }[] = [];
    const stops = day.stops.map((stop) => {
      const place = places.get(stop.placeId);
      const travelMinFromPrev = previous?.location && place?.location ? travel(previous.location, place.location) : 0;
      const earliest = cursor + travelMinFromPrev;
      const start = stop.manualStart ? minutes(stop.manualStart) : earliest;
      const end = stop.manualEnd ? minutes(stop.manualEnd) : start + (stop.durationMin ?? place?.visitDurationMin ?? 60);
      if (start < minutes(day.startTime) || end <= start || start >= 1440 || end > 1440) issue('invalid_time', 'error', 'Giờ đến/đi phải theo thứ tự và nằm trong ngày', stop.key);
      if (start < earliest) issue('overlap', 'error', 'Giờ đến chồng với điểm trước hoặc chưa đủ thời gian di chuyển', stop.key);
      if (!place) issue('missing_place', 'error', 'Địa điểm không còn tồn tại trong thành phố này', stop.key);
      else {
        if (['suspected', 'hidden', 'closed', 'merged'].includes(place.status)) issue('unavailable', 'error', 'Địa điểm đang bị nghi ngờ, ẩn, đã đóng hoặc đã gộp', stop.key);
        if (!place.location) issue('location_missing', 'error', 'Địa điểm chưa có toạ độ để tính di chuyển', stop.key);
        if (!coversVisit(place, weekday, start, end)) issue('outside_hours', 'error', 'Giờ ghé nằm ngoài giờ mở cửa vào ngày này', stop.key);
        if (place.status === 'draft') issue('draft_place', 'warning', 'Địa điểm còn là nháp', stop.key);
        if (verificationStale(place.lastVerifiedAt, now)) issue('stale_verification', 'warning', 'Địa điểm quá 90 ngày chưa xác minh hoặc chưa được xác minh', stop.key);
        if (!place.validPhoto) issue('missing_photo', 'warning', 'Địa điểm chưa có ảnh hợp lệ', stop.key);
      }
      intervals.push({ start, end, meal: stop.kind === 'meal' });
      cursor = end;
      previous = place;
      return { ...stop, start: formatTime(start), end: formatTime(end), travelMinFromPrev };
    });
    const first = intervals[0];
    const last = intervals.at(-1);
    if (first && last) {
      for (const [from, to, code, label] of [[690, 810, 'missing_lunch', 'bữa trưa (11:30–13:30)'], [1080, 1200, 'missing_dinner', 'bữa tối (18:00–20:00)']] as const) {
        if (first.start < to && last.end > from && !intervals.some((slot) => slot.meal && slot.start < to && slot.end > from)) issue(code, 'warning', `Lịch trình đi qua khung giờ nhưng thiếu ${label}`);
      }
      if (last.end > 1290) issue('late_finish', 'warning', 'Ngày kết thúc sau 21:30');
    }
    return { day: index + 1, weekday, startTime: day.startTime, stops };
  });
  return { days, issues, canPublish: !issues.some((issue) => issue.level === 'error') };
}
