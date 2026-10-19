import { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { templateTicketData, ticketHash, ticketObjectKey, ticketRows } from './ticket-data';

// Dữ liệu giả, tên rõ là giả.
const ctx = { cityName: 'Thành phố Giả Lập', citySlug: 'da-lat', accent: '#E9B824', siteUrl: 'https://ranhduong.vn' };
function detail(days: (number | null)[][], extra: Partial<ItineraryTemplateDetail> = {}): ItineraryTemplateDetail {
  return ItineraryTemplateDetail.parse({
    slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', description: '', season: 'Mùa Giả Lập', style: '', seoTitle: '', seoDescription: '',
    transport: 'motorbike', pace: 'relaxed',
    days: days.map((stops, d) => ({ day: d + 1, stops: stops.map((n, s) => ({
      key: `${d + 1}-${s + 1}`, number: s + 1, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit',
      place: n === null ? null : { slug: `quan-gia-lap-${n}`, name: `Quán Giả Lập ${n}`, category: 'cafe', alsoCategories: [], unconfirmed: true },
    })) })),
    ...extra,
  });
}

describe('S30 dữ liệu vé', () => {
  it('QR tới trang mẫu có utm_source=ticket; đường dẫn rút gọn không có giao thức', () => {
    const data = templateTicketData(detail([[1, 2]]), ctx);
    expect(data.qrUrl).toBe('https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket');
    expect(data.shortLink).toBe('ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap');
    expect(data).toMatchObject({ cityName: 'Thành phố Giả Lập', accent: '#E9B824', title: 'Lịch trình Giả Lập', season: 'Mùa Giả Lập', transport: 'motorbike', days: 1 });
  });
  it('bỏ ô điểm không còn công khai và đánh số lại trong từng ngày', () => {
    const data = templateTicketData(detail([[1, null, 3], [4]]), ctx);
    expect(data.stops.map((s) => [s.day, s.number, s.name])).toEqual([[1, 1, 'Quán Giả Lập 1'], [1, 2, 'Quán Giả Lập 3'], [2, 1, 'Quán Giả Lập 4']]);
    expect(data.stopTotal).toBe(3);
    expect(data.days).toBe(2);
  });
  it('chuyến một ngày: tối đa 8 điểm rồi + x điểm; OG 3 điểm', () => {
    const data = templateTicketData(detail([Array.from({ length: 12 }, (_, i) => i + 1)]), ctx);
    expect([data.stops.length, data.stopTotal]).toEqual([8, 12]);
    expect(ticketRows(data, 'story')).toMatchObject({ more: 4, dayLabels: false });
    expect(ticketRows(data, 'og')).toMatchObject({ more: 9, dayLabels: false });
    expect(ticketRows(data, 'og').stops).toHaveLength(3);
  });
  it('nhãn ngày tính vào ngân sách 10 dòng', () => {
    const data = templateTicketData(detail([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]), ctx);
    expect(data.stops.map((s) => s.day)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(ticketRows(data, 'story')).toMatchObject({ more: 4, dayLabels: true });
  });
  it('OG ít hơn 3 điểm thì không có + x điểm', () => {
    const data = templateTicketData(detail([[1, 2]]), ctx);
    expect(ticketRows(data, 'og')).toMatchObject({ more: 0 });
    expect(ticketRows(data, 'og').stops).toHaveLength(2);
  });
  it('mẫu không còn điểm công khai vẫn có dữ liệu vé', () => {
    expect(templateTicketData(detail([[null]]), ctx)).toMatchObject({ stops: [], stopTotal: 0 });
  });
  it('hash ổn định, đổi theo tên điểm, tiêu đề, URL web; khoá không chứa ObjectId', () => {
    const base = ticketHash(templateTicketData(detail([[1, 2]]), ctx));
    expect(ticketHash(templateTicketData(detail([[1, 2]]), ctx))).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{32}$/);
    for (const changed of [detail([[1, 3]]), detail([[1, 2]], { title: 'Lịch trình Giả Lập khác' })]) expect(ticketHash(templateTicketData(changed, ctx))).not.toBe(base);
    expect(ticketHash(templateTicketData(detail([[1, 2]]), { ...ctx, siteUrl: 'https://staging.ranhduong.vn' }))).not.toBe(base);
    expect(ticketObjectKey(base, 'og')).toBe(`tickets/${base}/og.png`);
  });
  it('đổi giờ ghé của một điểm thì hash đổi', () => {
    const moved = detail([[1, 2]]);
    moved.days[0]!.stops[1]!.start = '09:30';
    expect(ticketHash(templateTicketData(moved, ctx))).not.toBe(ticketHash(templateTicketData(detail([[1, 2]]), ctx)));
  });
});
