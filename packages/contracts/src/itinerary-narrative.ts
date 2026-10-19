import { z } from 'zod';
import { TripDays } from './itinerary.js';

const introduction = z.string().trim().min(1, 'Mô tả không được để trống').max(4000);

/** Chỉ kiểm cấu trúc; S43 kiểm key thuộc lịch trình và thông tin thực tế theo đầu vào LLM. */
export const ItineraryNarrative = z.strictObject({
  intro: introduction,
  days: z.array(z.strictObject({
    day: TripDays,
    intro: introduction,
    stops: z.array(z.strictObject({
      key: z.uuid(),
      note: z.string().trim().min(1, 'Ghi chú không được để trống').max(2000),
    })).min(1).max(20),
  })).min(1).max(5),
}).superRefine(({ days }, ctx) => {
  const seenDays = new Set<number>();
  const seenKeys = new Set<string>();
  days.forEach((day, d) => {
    if (seenDays.has(day.day)) ctx.addIssue({ code: 'custom', path: ['days', d, 'day'], message: 'Ngày trong mô tả bị lặp' });
    seenDays.add(day.day);
    day.stops.forEach((stop, s) => {
      if (seenKeys.has(stop.key)) ctx.addIssue({ code: 'custom', path: ['days', d, 'stops', s, 'key'], message: 'Mã điểm dừng trong mô tả bị lặp' });
      seenKeys.add(stop.key);
    });
  });
});
export type ItineraryNarrative = z.infer<typeof ItineraryNarrative>;
