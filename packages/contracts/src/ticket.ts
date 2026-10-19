import { z } from 'zod';
import { HexColor, ObjectIdString } from './common.js';
import { TemplateTime } from './itinerary-admin.js';
import { ItineraryTransport, TripDays } from './itinerary.js';

/** Vé lịch trình dạng ảnh (Spec UI mục 9): story để lưu, đăng; og làm ảnh xem trước khi dán link. */
export const TicketFormat = z.enum(['story', 'og']);
export type TicketFormat = z.infer<typeof TicketFormat>;

/** Query của `GET …/ticket.png`; tham số khác (utm, v) bị bỏ. */
export const TicketQuery = z.object({ format: TicketFormat });
export type TicketQuery = z.infer<typeof TicketQuery>;

export const TICKET_SIZE: Record<TicketFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};
/** Story hiện tối đa 8 điểm rồi "+ x điểm"; OG chỉ 3 điểm đầu. */
export const TICKET_MAX_STOPS = 8;
export const TICKET_OG_STOPS = 3;

/** Hash nội dung vé, dùng làm khoá R2 `tickets/{hash}/…` (không chứa ObjectId). */
export const TicketHash = z.string().regex(/^[0-9a-f]{32}$/);
export type TicketHash = z.infer<typeof TicketHash>;

export const TicketStop = z.object({
  day: z.number().int().min(1).max(5),
  number: z.number().int().min(1).max(20),
  start: TemplateTime,
  name: z.string().min(1).max(200),
});
export type TicketStop = z.infer<typeof TicketStop>;

/** Nội dung vẽ lên vé. Không có trường vị trí: vé không bao giờ chứa nơi ở của khách (ADR 0014). */
export const TicketData = z.object({
  cityName: z.string().min(1),
  title: z.string().min(1).max(200),
  days: TripDays,
  transport: ItineraryTransport,
  season: z.string().max(100),
  accent: HexColor,
  stops: z.array(TicketStop).max(TICKET_MAX_STOPS),
  stopTotal: z.number().int().nonnegative(),
  shortLink: z.string().min(1),
  // z.httpUrl() bắt hostname có đuôi tên miền, chặn mất web local và staging theo IP; chỉ cần đúng giao thức http(s).
  qrUrl: z.url({ protocol: /^https?$/ }),
}).refine((data) => data.stopTotal >= data.stops.length, { path: ['stopTotal'], message: 'stopTotal nhỏ hơn số điểm hiện trên vé' });
export type TicketData = z.infer<typeof TicketData>;

/** Payload job `itinerary.ticket` (technical-design mục 10). */
export const TicketJob = z.object({ itineraryId: ObjectIdString, hash: TicketHash, data: TicketData });
export type TicketJob = z.infer<typeof TicketJob>;
