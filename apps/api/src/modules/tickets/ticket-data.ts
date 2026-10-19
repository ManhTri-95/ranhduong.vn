import { createHash } from 'node:crypto';
import {
  TICKET_MAX_STOPS, TICKET_OG_STOPS, TicketData,
  type ItineraryTemplateDetail, type TicketFormat, type TicketStop,
} from '@ranhduong/contracts';

/** Đổi layout, nhãn hoặc bản thư viện vẽ vé thì tăng số này để mọi vé sinh lại (hash đổi). */
export const TICKET_RENDER_VERSION = 1;
/**
 * Ngân sách dòng của story: mỗi điểm 1 dòng; chuyến nhiều ngày thì điểm đầu mỗi ngày tốn thêm 1 dòng cho nhãn "NGÀY n",
 * để vé 5 ngày không đẩy cuống vé ra ngoài ảnh.
 */
export const TICKET_STORY_ROWS = 10;

export interface TicketContext { cityName: string; citySlug: string; accent: string; siteUrl: string }

/** Vé của lịch trình mẫu: chỉ điểm còn công khai, QR tới trang mẫu có utm_source=ticket. */
export function templateTicketData(detail: ItineraryTemplateDetail, ctx: TicketContext): TicketData {
  const all: TicketStop[] = [];
  for (const day of detail.days) {
    let number = 0;
    for (const stop of day.stops) {
      if (!stop.place) continue;
      number++;
      all.push({ day: day.day, number, start: stop.start, name: stop.place.name });
    }
  }
  const multiDay = detail.days.length > 1;
  const stops: TicketStop[] = [];
  let rows = 0;
  for (const stop of all) {
    const cost = multiDay && stop.day !== stops.at(-1)?.day ? 2 : 1;
    if (stops.length === TICKET_MAX_STOPS || rows + cost > TICKET_STORY_ROWS) break;
    stops.push(stop);
    rows += cost;
  }
  const url = new URL(`/${ctx.citySlug}/lich-trinh/${detail.slug}`, ctx.siteUrl);
  const shortLink = `${url.host}${url.pathname}`;
  url.searchParams.set('utm_source', 'ticket');
  return TicketData.parse({
    cityName: ctx.cityName, title: detail.title, days: detail.days.length, transport: detail.transport, season: detail.season,
    accent: ctx.accent, stops, stopTotal: all.length, shortLink, qrUrl: url.toString(),
  });
}

/** Điểm hiện trên từng loại ảnh và số điểm còn lại cho dòng "+ x điểm". */
export function ticketRows(data: TicketData, format: TicketFormat): { stops: TicketStop[]; more: number; dayLabels: boolean } {
  const stops = format === 'story' ? data.stops : data.stops.slice(0, TICKET_OG_STOPS);
  return { stops, more: data.stopTotal - stops.length, dayLabels: format === 'story' && data.days > 1 };
}

export function ticketHash(data: TicketData): string {
  return createHash('sha256').update(JSON.stringify({ v: TICKET_RENDER_VERSION, data })).digest('hex').slice(0, 32);
}

export function ticketPrefix(hash: string): string { return `tickets/${hash}`; }
export function ticketObjectKey(hash: string, format: TicketFormat): string { return `${ticketPrefix(hash)}/${format}.png`; }
