import type { ItineraryTemplateDetail } from '@ranhduong/contracts';

export type ItineraryDay = ItineraryTemplateDetail['days'][number];
export interface ItinerarySummary { stopCount: number; mealCount: number; zones: string[] }

/** Ghi chú điểm ghé dài hơn ngưỡng này thì rút còn 2 dòng kèm "Xem thêm". */
export const NOTE_PREVIEW_CHARS = 90;
/** Mô tả lịch trình dài hơn ngưỡng này thì rút còn 3 dòng kèm "Đọc thêm". */
export const DESCRIPTION_PREVIEW_CHARS = 160;

/** Tổng quan đầu trang: mọi điểm dừng (khớp stopCount của thẻ trang chủ), bữa ăn, khu vực không trùng theo thứ tự ghé. */
export function itinerarySummary(days: readonly ItineraryDay[]): ItinerarySummary {
  const stops = days.flatMap((day) => day.stops);
  const zones = [...new Set(stops.flatMap((stop) => (stop.place?.zoneName ? [stop.place.zoneName] : [])))];
  return { stopCount: stops.length, mealCount: stops.filter((stop) => stop.kind === 'meal').length, zones };
}

export function summaryLine(summary: ItinerarySummary): string {
  if (!summary.stopCount) return '';
  return [`${summary.stopCount} điểm`, summary.mealCount ? `${summary.mealCount} bữa ăn` : '', summary.zones.join(', ')].filter(Boolean).join(' · ');
}

/** Giờ bắt đầu điểm đầu và giờ kết thúc điểm cuối của một ngày; ngày rỗng thì null. */
export function daySpan(day: ItineraryDay): { start: string; end: string } | null {
  const first = day.stops[0];
  const last = day.stops.at(-1);
  return first && last ? { start: first.start, end: last.end } : null;
}

export function noteNeedsToggle(text: string, limit = NOTE_PREVIEW_CHARS): boolean {
  return text.trim().length > limit;
}
