import type { OpeningSlot } from '@ranhduong/contracts';
import { z } from 'zod';

export const Shift = z.object({ open: z.string(), close: z.string() });
export type Shift = z.infer<typeof Shift>;

/** Giờ một ngày: Đóng, Mở cả ngày, hoặc các ca (giờ dạng HH:mm, '' khi chưa nhập). */
export const DayHours = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('closed') }),
  z.object({ kind: z.literal('allDay') }),
  z.object({ kind: z.literal('shifts'), shifts: z.array(Shift).min(1) }),
]);
export type DayHours = z.infer<typeof DayHours>;

/** Giờ 7 ngày; chỉ số là ngày của OpeningSlot (0 = Chủ nhật). */
export const WeekHours = z.array(DayHours).length(7);
export type WeekHours = DayHours[];

const ALL_DAY = { open: '00:00', close: '24:00' } as const;
/** Ca mới để trống: không điền giờ mẫu nào (không bịa giờ mở cửa). */
const emptyShift = (): Shift => ({ open: '', close: '' });

export function closedWeek(): WeekHours {
  return Array.from({ length: 7 }, (): DayHours => ({ kind: 'closed' }));
}

/** OpeningSlot[] → giờ từng ngày. Ngày không có ca là Đóng; đúng một ca 00:00-24:00 là Mở cả ngày. */
export function weekFromSlots(slots: readonly OpeningSlot[]): WeekHours {
  return Array.from({ length: 7 }, (_, day): DayHours => {
    const shifts = slots
      .filter((s) => s.day === day)
      .sort((a, b) => a.open.localeCompare(b.open))
      .map(({ open, close }) => ({ open, close }));
    const [first] = shifts;
    if (!first) return { kind: 'closed' };
    if (shifts.length === 1 && first.open === ALL_DAY.open && first.close === ALL_DAY.close) return { kind: 'allDay' };
    return { kind: 'shifts', shifts };
  });
}

/** Giờ từng ngày → OpeningSlot[] theo ngày rồi giờ mở. Ca chưa nhập giữ chuỗi rỗng để validate báo lỗi. */
export function slotsFromWeek(week: WeekHours): OpeningSlot[] {
  return week
    .flatMap((hours, day): OpeningSlot[] => {
      if (hours.kind === 'closed') return [];
      if (hours.kind === 'allDay') return [{ day, ...ALL_DAY }];
      return hours.shifts.map((s) => ({ day, open: s.open, close: s.close }));
    })
    .sort((a, b) => a.day - b.day || a.open.localeCompare(b.open));
}

export function setDayKind(week: WeekHours, day: number, kind: DayHours['kind']): WeekHours {
  const next: DayHours = kind === 'shifts' ? { kind, shifts: [emptyShift()] } : { kind };
  return week.map((hours, i) => (i === day ? next : hours));
}

export function addShift(week: WeekHours, day: number): WeekHours {
  return week.map((hours, i): DayHours => {
    if (i !== day) return hours;
    return { kind: 'shifts', shifts: [...(hours.kind === 'shifts' ? hours.shifts : []), emptyShift()] };
  });
}

export function updateShift(week: WeekHours, day: number, index: number, patch: Partial<Shift>): WeekHours {
  return week.map((hours, i): DayHours => {
    if (i !== day || hours.kind !== 'shifts') return hours;
    return { kind: 'shifts', shifts: hours.shifts.map((s, j) => (j === index ? { ...s, ...patch } : s)) };
  });
}

/** Xoá một ca; xoá ca cuối cùng thì ngày đó thành Đóng. */
export function removeShift(week: WeekHours, day: number, index: number): WeekHours {
  return week.map((hours, i): DayHours => {
    if (i !== day || hours.kind !== 'shifts') return hours;
    const shifts = hours.shifts.filter((_, j) => j !== index);
    return shifts.length > 0 ? { kind: 'shifts', shifts } : { kind: 'closed' };
  });
}
