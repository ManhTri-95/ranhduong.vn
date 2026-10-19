import { describe, expect, it } from 'vitest';
import { templateTicketUrl, ticketFileName } from './ticket-url';

describe('S30 URL ảnh vé lịch trình mẫu', () => {
  it('ghép theo slug, bỏ / cuối của API, có format', () => {
    expect(templateTicketUrl('https://api.ranhduong.vn/v1/', 'da-lat', 'lich-trinh-gia-lap', 'og'))
      .toBe('https://api.ranhduong.vn/v1/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket.png?format=og');
    expect(templateTicketUrl('http://localhost:3101/v1', 'da-lat', 'lich-trinh-gia-lap', 'story'))
      .toBe('http://localhost:3101/v1/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket.png?format=story');
  });
  it('tên file tải về theo slug', () => {
    expect(ticketFileName('lich-trinh-gia-lap')).toBe('ve-lich-trinh-lich-trinh-gia-lap.png');
  });
});
