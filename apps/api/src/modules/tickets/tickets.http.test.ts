import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../app.setup';
import { ConfigModule } from '../../config/config.module';
import { ApiException } from '../../shared/http/api-exception';
import { testEnv } from '../../testing/env';
import { TicketsController } from './tickets.controller';
import { TicketsService, type TicketImage } from './tickets.service';

const WEB = 'http://web.gia-lap.example';
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);

describe('S30 GET /v1/cities/:city/itineraries/templates/:slug/ticket.png', () => {
  let app: INestApplication;
  let base: string;
  const tickets = { templateTicket: vi.fn<(city: string, slug: string, format: string) => Promise<TicketImage>>() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.register(testEnv({ WEB_ORIGINS: WEB }))],
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: tickets }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app, [WEB]);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/v1/cities/da-lat/itineraries/templates`;
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { tickets.templateTicket.mockReset(); });

  it('vé đã có: 200 PNG, cache 1 giờ, đúng bytes', async () => {
    tickets.templateTicket.mockResolvedValue({ status: 'ready', body: PNG });
    const res = await fetch(`${base}/lich-trinh-gia-lap/ticket.png?format=og&utm_source=x`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG);
    expect(tickets.templateTicket).toHaveBeenCalledWith('da-lat', 'lich-trinh-gia-lap', 'og');
  });
  it('ảnh mặc định: 200 PNG nhưng no-store để CDN không giữ', async () => {
    tickets.templateTicket.mockResolvedValue({ status: 'fallback', body: PNG });
    const res = await fetch(`${base}/lich-trinh-gia-lap/ticket.png?format=og`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  it('story chưa in xong: 503, Retry-After 3, JSON lỗi chung', async () => {
    tickets.templateTicket.mockResolvedValue({ status: 'pending' });
    const res = await fetch(`${base}/lich-trinh-gia-lap/ticket.png?format=story`);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('3');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ code: 'INTERNAL_ERROR', message: 'Vé đang được in, thử lại sau vài giây nhé.' });
  });
  it.each(['?format=png', ''])('format sai hoặc thiếu (%s): 400 VALIDATION_FAILED', async (query) => {
    const res = await fetch(`${base}/lich-trinh-gia-lap/ticket.png${query}`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(tickets.templateTicket).not.toHaveBeenCalled();
  });
  it('slug sai định dạng: 400', async () => {
    expect((await fetch(`${base}/bad_slug/ticket.png?format=og`)).status).toBe(400);
  });
  it('không có mẫu: 404 NOT_FOUND', async () => {
    tickets.templateTicket.mockRejectedValue(new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lịch trình'));
    const res = await fetch(`${base}/khong-co/ticket.png?format=og`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
  it('web khách tải ảnh qua fetch có CORS đúng nguồn', async () => {
    tickets.templateTicket.mockResolvedValue({ status: 'ready', body: PNG });
    const res = await fetch(`${base}/lich-trinh-gia-lap/ticket.png?format=story`, { headers: { origin: WEB } });
    expect(res.headers.get('access-control-allow-origin')).toBe(WEB);
  });
});
