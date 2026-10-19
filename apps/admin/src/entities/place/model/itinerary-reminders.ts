import { verificationStale, VERIFY_MAX_AGE_DAYS, type AdminPlaceSummary } from '@ranhduong/contracts';
import { z } from 'zod';

export const ItineraryReminder = z.enum(['duration_missing', 'best_time_missing', 'zone_missing', 'verification_stale', 'verification_due']);
export type ItineraryReminder = z.infer<typeof ItineraryReminder>;

export const ITINERARY_REMINDER_LABEL: Record<ItineraryReminder, string> = {
  duration_missing: 'Chưa có thời lượng ghé',
  best_time_missing: 'Chưa có thời điểm đẹp',
  zone_missing: 'Chưa chọn cụm',
  verification_stale: 'Quá 90 ngày hoặc chưa xác minh',
  verification_due: 'Sắp cần xác minh',
};

/** Nhắc trước một tuần để kịp bổ sung dữ liệu trước khi quá hạn 90 ngày. */
export const VERIFY_REMINDER_DAYS = 7;
const DAY_MS = 86_400_000;

/** Nhắc cho lịch trình, độc lập với điều kiện kích hoạt; tính theo cùng mốc giờ của danh sách và bộ lọc. */
export function itineraryReminders(
  place: Pick<AdminPlaceSummary, 'zone' | 'visitDurationMin' | 'bestTime' | 'lastVerifiedAt'>,
  now: Date,
): ItineraryReminder[] {
  const reminders: ItineraryReminder[] = [];
  if (place.visitDurationMin === undefined) reminders.push('duration_missing');
  if (!place.bestTime?.length) reminders.push('best_time_missing');
  if (!place.zone) reminders.push('zone_missing');
  if (verificationStale(place.lastVerifiedAt, now)) {
    reminders.push('verification_stale');
  } else if (place.lastVerifiedAt && now.getTime() - Date.parse(place.lastVerifiedAt) >= (VERIFY_MAX_AGE_DAYS - VERIFY_REMINDER_DAYS) * DAY_MS) {
    reminders.push('verification_due');
  }
  return reminders;
}
