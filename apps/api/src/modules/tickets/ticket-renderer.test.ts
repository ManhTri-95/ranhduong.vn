import { ItineraryTemplateDetail, TICKET_SIZE, TicketData } from '@ranhduong/contracts';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { loadTicketFonts, readTokensCss, ticketColors } from './ticket-assets';
import { templateTicketData } from './ticket-data';
import { ticketQrDataUri } from './ticket-layout';
import { renderTicketPng } from './ticket-renderer';

// Dữ liệu giả, tên rõ là giả.
const assets = { fonts: loadTicketFonts(), tokensCss: readTokensCss() };
const colors = ticketColors(assets.tokensCss, '#E9B824');
const data = TicketData.parse({
  cityName: 'Thành phố Giả Lập', title: 'Lịch trình Giả Lập', days: 2, transport: 'motorbike', season: '', accent: '#E9B824',
  stops: [{ day: 1, number: 1, start: '08:00', name: 'Quán Giả Lập 1' }, { day: 2, number: 1, start: '09:00', name: 'Quán Giả Lập 2' }],
  stopTotal: 2, shortLink: 'ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap',
  qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket',
});
const vietnamese = TicketData.parse({ ...data, title: 'Đường đèo Giả Lập: ngắm mây ở đồi chè, ăn bánh căn', season: 'Mùa dã quỳ Giả Lập',
  stops: [{ day: 1, number: 1, start: '05:00', name: 'Đồi Giả Lập ưa nhìn' }], stopTotal: 1 });
const longFiveDays = templateTicketData(ItineraryTemplateDetail.parse({
  slug: 'lich-trinh-gia-lap-rat-dai', title: 'Lịch trình Giả Lập '.repeat(11).slice(0, 198) + '🌼', description: '', season: 'Mùa Giả Lập',
  style: '', seoTitle: '', seoDescription: '', transport: 'car', pace: 'packed',
  days: Array.from({ length: 5 }, (_, d) => ({ day: d + 1, stops: Array.from({ length: 3 }, (_, s) => ({
    key: `${d + 1}-${s + 1}`, number: s + 1, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit',
    place: { slug: `quan-gia-lap-${d}-${s}`, name: `Quán Giả Lập rất dài ${d}-${s} `.repeat(6).slice(0, 120), category: 'food', alsoCategories: [], unconfirmed: true },
  })) })),
}), { cityName: 'Thành phố Giả Lập', citySlug: 'da-lat', accent: '#E9B824', siteUrl: 'https://ranhduong.vn' });

describe('S30 dựng ảnh vé', () => {
  it.each(['story', 'og'] as const)('%s: PNG đúng kích thước, chữ có dấu không thiếu glyph', async (format) => {
    const missing = vi.fn();
    const png = await renderTicketPng(vietnamese, format, assets, missing);
    expect(await sharp(png).metadata()).toMatchObject({ format: 'png', ...TICKET_SIZE[format] });
    expect(missing).not.toHaveBeenCalled();
  });
  it('tiêu đề 200 ký tự có emoji, tên dài, 5 ngày, mẫu rỗng vẫn ra PNG; chỉ emoji thiếu glyph', async () => {
    const missing = vi.fn();
    for (const sample of [longFiveDays, TicketData.parse({ ...data, stops: [], stopTotal: 0 })]) {
      for (const format of ['story', 'og'] as const) {
        expect(await sharp(await renderTicketPng(sample, format, assets, missing)).metadata()).toMatchObject(TICKET_SIZE[format]);
      }
    }
    for (const [code] of missing.mock.calls) expect(code).toBe('emoji');
  });
  it('QR là SVG dùng màu ink trên nền paperRaised', () => {
    const uri = ticketQrDataUri(data.qrUrl, colors);
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const svg = Buffer.from(uri.split(',')[1]!, 'base64').toString();
    expect(svg).toContain(colors.ink);
    expect(svg).toContain(colors.paperRaised);
  });
});
