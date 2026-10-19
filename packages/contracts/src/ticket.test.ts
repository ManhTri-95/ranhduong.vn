import { describe, expect, it } from 'vitest';
import { TICKET_MAX_STOPS, TICKET_OG_STOPS, TICKET_SIZE, TicketData, TicketHash, TicketJob, TicketQuery } from './ticket.js';

const stop = (number: number, day = 1) => ({ day, number, start: '08:00', name: `Quán Giả Lập ${number}` });
const data = {
  cityName: 'Thành phố Giả Lập', title: 'Lịch trình Giả Lập', days: 2, transport: 'motorbike', season: '', accent: '#E9B824',
  stops: [stop(1), stop(2)], stopTotal: 2, shortLink: 'ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap',
  qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket',
};

describe('S30 ticket contracts', () => {
  it('format bắt buộc, chỉ story hoặc og; bỏ tham số lạ', () => {
    expect(TicketQuery.parse({ format: 'story', utm_source: 'x' })).toEqual({ format: 'story' });
    for (const bad of [{}, { format: 'png' }]) expect(TicketQuery.safeParse(bad).success).toBe(false);
  });
  it('story 1080×1920, og 1200×630, tối đa 8 điểm, OG 3 điểm', () => {
    expect(TICKET_SIZE).toEqual({ story: { width: 1080, height: 1920 }, og: { width: 1200, height: 630 } });
    expect([TICKET_MAX_STOPS, TICKET_OG_STOPS]).toEqual([8, 3]);
  });
  it('hash là 32 ký tự hex thường', () => {
    expect(TicketHash.safeParse('a'.repeat(32)).success).toBe(true);
    for (const bad of ['A'.repeat(32), 'a'.repeat(31), '0123456789abcdef01234567']) expect(TicketHash.safeParse(bad).success).toBe(false);
  });
  it('TicketData chặn 9 điểm, stopTotal nhỏ hơn số điểm hiện và QR không phải http(s)', () => {
    expect(TicketData.safeParse(data).success).toBe(true);
    expect(TicketData.safeParse({ ...data, stops: Array.from({ length: 9 }, (_, i) => stop(i + 1)), stopTotal: 9 }).success).toBe(false);
    expect(TicketData.safeParse({ ...data, stopTotal: 1 }).success).toBe(false);
    expect(TicketData.safeParse({ ...data, qrUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('TicketJob cần itineraryId dạng ObjectId và hash hợp lệ', () => {
    expect(TicketJob.safeParse({ itineraryId: '0123456789abcdef01234567', hash: 'b'.repeat(32), data }).success).toBe(true);
    expect(TicketJob.safeParse({ itineraryId: 'lich-trinh-gia-lap', hash: 'b'.repeat(32), data }).success).toBe(false);
  });
});
