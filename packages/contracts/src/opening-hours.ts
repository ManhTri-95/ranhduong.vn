import { z } from 'zod';

/** 0 = Chủ nhật … 6 = Thứ bảy (giống Date.getDay()). */
export const OpeningSlot = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});
export type OpeningSlot = z.infer<typeof OpeningSlot>;

const DAY_INDEX: Record<string, number> = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 };
/** Thứ tự trong tuần theo cách nói tiếng Việt: T2 … T7, CN. */
const WEEK_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export class OpeningHoursParseError extends Error {}

function parseDays(spec: string): number[] {
  const days = new Set<number>();
  for (const part of spec.split(',')) {
    const token = part.trim().toUpperCase();
    const range = token.split('-');
    if (range.length === 2) {
      const from = WEEK_ORDER.indexOf(range[0]!);
      const to = WEEK_ORDER.indexOf(range[1]!);
      if (from < 0 || to < 0 || to < from) throw new OpeningHoursParseError(`Khoảng ngày không hợp lệ: ${token}`);
      for (let i = from; i <= to; i++) days.add(DAY_INDEX[WEEK_ORDER[i]!]!);
    } else if (token in DAY_INDEX) {
      days.add(DAY_INDEX[token]!);
    } else {
      throw new OpeningHoursParseError(`Ngày không hợp lệ: ${token}`);
    }
  }
  return [...days];
}

function checkTime(t: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m || Number(m[1]) > 24 || Number(m[2]) > 59) throw new OpeningHoursParseError(`Giờ không hợp lệ: ${t}`);
  return t;
}

/**
 * Đọc giờ mở cửa theo định dạng của tài liệu quy trình thu thập (mục 5), ví dụ:
 * "T2-T6 07:00-22:00; T7-CN 06:30-23:00", "T2-CN 06:30-11:00,14:00-22:00", "T2 Đóng", "T2-CN 24h".
 * Ngày "Đóng" không tạo slot nào.
 */
export function parseOpeningHours(input: string): OpeningSlot[] {
  const slots: OpeningSlot[] = [];
  for (const segment of input.split(';').map((s) => s.trim()).filter(Boolean)) {
    const space = segment.indexOf(' ');
    if (space < 0) throw new OpeningHoursParseError(`Thiếu giờ: ${segment}`);
    const days = parseDays(segment.slice(0, space));
    const timePart = segment.slice(space + 1).trim();
    if (/^đóng$/i.test(timePart)) continue;
    const ranges = /^24h$/i.test(timePart) ? ['00:00-24:00'] : timePart.split(',').map((r) => r.trim());
    for (const range of ranges) {
      const [open, close] = range.split('-');
      if (!open || !close) throw new OpeningHoursParseError(`Khoảng giờ không hợp lệ: ${range}`);
      for (const day of days) slots.push({ day, open: checkTime(open), close: checkTime(close) });
    }
  }
  return slots.sort((a, b) => a.day - b.day || a.open.localeCompare(b.open));
}

/** Đang mở tại thời điểm `minutesOfDay` (0..1439) của ngày `day`, có xử lý ca qua nửa đêm. */
export function isOpenAt(slots: OpeningSlot[], day: number, minutesOfDay: number): boolean {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return slots.some((s) => {
    const open = toMin(s.open);
    const close = toMin(s.close);
    if (close > open) return s.day === day && minutesOfDay >= open && minutesOfDay < close;
    // Qua nửa đêm: phần tối của ngày s.day, phần sáng của ngày hôm sau.
    return (s.day === day && minutesOfDay >= open) || ((s.day + 1) % 7 === day && minutesOfDay < close);
  });
}
