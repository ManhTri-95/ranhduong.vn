const FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
});

/**
 * Giờ và ngày theo giờ Việt Nam, ví dụ "14:32 08/10" (lưu UTC, hiển thị Asia/Ho_Chi_Minh).
 * Ghép từ từng phần vì dấu ngăn ngày, tháng của locale vi-VN khác nhau giữa các bản ICU ("08/10" hay "08-10").
 */
export function formatLocalTime(iso: string): string {
  const parts = FORMAT.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('hour')}:${part('minute')} ${part('day')}/${part('month')}`;
}

const DAY_PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Số thứ tự của ngày lịch ở Việt Nam chứa `date` (trừ hai số ra số ngày). */
function vnDayIndex(date: Date): number {
  const parts = DAY_PARTS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / 86_400_000;
}

/** "Hôm nay", "Hôm qua", "N ngày trước" theo ngày lịch ở Việt Nam (cột "Xác minh lần cuối"). Ngày trong tương lai coi là hôm nay. */
export function daysAgoText(iso: string, now: Date): string {
  const days = vnDayIndex(now) - vnDayIndex(new Date(iso));
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}
