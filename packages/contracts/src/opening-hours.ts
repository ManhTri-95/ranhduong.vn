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

const DAY_MIN = 1440;
const WEEK_MIN = 7 * DAY_MIN;
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type OpenStatus =
  | { kind: 'unknown' }
  /** closesAt null: mở 24/7. */
  | { kind: 'open'; closesAt: string | null }
  /** day: thứ của lần mở tới (0 = Chủ nhật); inDays: sau mấy ngày tính từ hôm nay. */
  | { kind: 'closed'; opensAt: string; day: number; inDays: number };

/** Thứ (0 = Chủ nhật) và phút trong ngày của `now` theo múi giờ `timeZone`. */
function localTime(now: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: WEEKDAY_EN.indexOf(part('weekday')), minutes: (Number(part('hour')) % 24) * 60 + Number(part('minute')) };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toHHmm = (minutes: number) => {
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Trạng thái mở cửa lúc `now` theo giờ địa phương: đang mở (đóng lúc nào), đang đóng (mở lại lúc nào, sau mấy ngày)
 * hoặc chưa có giờ. Các ca nối tiếp hoặc chồng nhau được gộp lại, kể cả ca qua nửa đêm và ca qua cuối tuần.
 * Ca có giờ đóng bằng giờ mở (ví dụ 00:00-00:00) coi như mở 24 giờ kể từ giờ mở.
 */
export function openStatus(slots: OpeningSlot[], now: Date, timeZone = 'Asia/Ho_Chi_Minh'): OpenStatus {
  if (slots.length === 0) return { kind: 'unknown' };
  // Mỗi ca thành khoảng [đầu, cuối) tính bằng phút trong tuần. Nhân bản sang tuần trước và tuần sau để xử lý quay vòng.
  const week = slots.map((s): [number, number] => {
    const open = toMinutes(s.open);
    const close = toMinutes(s.close);
    const start = s.day * DAY_MIN + open;
    return [start, start + (close > open ? close - open : close - open + DAY_MIN)];
  });
  const all = [-1, 0, 1]
    .flatMap((w) => week.map(([a, b]): [number, number] => [a + w * WEEK_MIN, b + w * WEEK_MIN]))
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of all) {
    const last = merged.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }

  const { day, minutes } = localTime(now, timeZone);
  const t = day * DAY_MIN + minutes;
  const current = merged.find(([a, b]) => a <= t && t < b);
  if (current) return { kind: 'open', closesAt: current[1] - current[0] >= WEEK_MIN ? null : toHHmm(current[1]) };
  const next = merged.find(([a]) => a > t);
  // Có ít nhất một ca và đã nhân bản sang tuần sau, nên luôn có lần mở tiếp theo.
  if (!next) return { kind: 'unknown' };
  const nextDayIndex = Math.floor(next[0] / DAY_MIN);
  return { kind: 'closed', opensAt: toHHmm(next[0]), day: ((nextDayIndex % 7) + 7) % 7, inDays: nextDayIndex - day };
}
