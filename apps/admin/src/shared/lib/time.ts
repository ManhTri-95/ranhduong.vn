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
