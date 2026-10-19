import { HttpStatus } from '@nestjs/common';
import { ItineraryTemplateDetail, type TicketJob } from '@ranhduong/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../shared/http/api-exception';
import { testEnv } from '../../testing/env';
import { templateTicketData, ticketHash } from './ticket-data';
import { InvalidTicketJob, TicketsService } from './tickets.service';

// Dữ liệu giả, tên rõ là giả.
const ID = '0123456789abcdef01234567';
const OLD = `tickets/${'e'.repeat(32)}`;
const detail = ItineraryTemplateDetail.parse({
  slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', description: '', season: '', style: '', seoTitle: '', seoDescription: '',
  transport: 'motorbike', pace: 'relaxed',
  days: [{ day: 1, stops: [1, 2].map((n) => ({ key: `1-${n}`, number: n, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit',
    place: { slug: `quan-gia-lap-${n}`, name: `Quán Giả Lập ${n}`, category: 'cafe', alsoCategories: [], unconfirmed: true } })) }],
});
const data = templateTicketData(detail, { cityName: 'Thành phố Giả Lập', citySlug: 'da-lat', accent: '#E9B824', siteUrl: 'https://ranhduong.vn' });
const hash = ticketHash(data);
const key = (format: string, h = hash) => `tickets/${h}/${format}.png`;

function setup() {
  const files = new Map<string, Buffer>();
  const storage = {
    read: vi.fn(async (k: string) => files.get(k) ?? null),
    write: vi.fn(async (k: string, body: Buffer) => { files.set(k, body); }),
    remove: vi.fn(async (keys: string[]) => { for (const k of keys) files.delete(k); }),
  };
  const queue = { request: vi.fn(async (_job: TicketJob) => undefined) };
  const renderer = { render: vi.fn(async (_data: unknown, format: string) => Buffer.from(`png-${format}`)), defaultOg: vi.fn(() => Buffer.from('mac-dinh')) };
  const cities = { getPublic: vi.fn(async () => ({ name: 'Thành phố Giả Lập', accent: '#E9B824' })) };
  const itineraries = {
    templateTicketSource: vi.fn(async () => ({ id: ID, detail })),
    swapTicketKey: vi.fn(async (): Promise<string | undefined> => undefined),
  };
  const service = new TicketsService(testEnv({ SITE_URL: 'https://ranhduong.vn' }), cities, itineraries, storage, queue, renderer, { og: 40, story: 40, pollMs: 5 });
  return { files, storage, queue, renderer, itineraries, service };
}

describe('S30 TicketsService phục vụ ảnh vé', () => {
  it('ảnh đã có: ready, không xếp job', async () => {
    const t = setup();
    t.files.set(key('og'), Buffer.from('co-san'));
    expect(await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'og')).toEqual({ status: 'ready', body: Buffer.from('co-san') });
    expect(t.queue.request).not.toHaveBeenCalled();
  });
  it('chưa có: xếp đúng một TicketJob có utm_source=ticket, rồi ready khi worker giả ghi ảnh', async () => {
    const t = setup();
    t.queue.request.mockImplementation(async (job: TicketJob) => { setTimeout(() => t.files.set(key('story', job.hash), Buffer.from('moi')), 10); });
    expect(await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'story')).toEqual({ status: 'ready', body: Buffer.from('moi') });
    expect(t.queue.request).toHaveBeenCalledTimes(1);
    expect(t.queue.request).toHaveBeenCalledWith({ itineraryId: ID, hash, data: expect.objectContaining({ qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket' }) });
  });
  it('hết giờ chờ: og dùng ảnh mặc định, story pending', async () => {
    const t = setup();
    expect(await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'og')).toEqual({ status: 'fallback', body: Buffer.from('mac-dinh') });
    expect(await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'story')).toEqual({ status: 'pending' });
  });
  it('Redis hoặc R2 lỗi: og dùng ảnh mặc định, story pending, không ném', async () => {
    const t = setup();
    t.queue.request.mockRejectedValue(new Error('Redis giả lập dừng'));
    expect((await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'og')).status).toBe('fallback');
    expect((await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'story')).status).toBe('pending');
    t.storage.read.mockRejectedValue(new Error('R2 giả lập lỗi'));
    expect((await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'og')).status).toBe('fallback');
    expect((await t.service.templateTicket('da-lat', 'lich-trinh-gia-lap', 'story')).status).toBe('pending');
  });
  it('404 từ lịch trình đi thẳng ra ngoài', async () => {
    const t = setup();
    const notFound = new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lịch trình');
    t.itineraries.templateTicketSource.mockRejectedValue(notFound);
    await expect(t.service.templateTicket('da-lat', 'khong-co', 'og')).rejects.toBe(notFound);
  });
});

describe('S30 TicketsService sinh vé (worker)', () => {
  const job: TicketJob = { itineraryId: ID, hash, data };
  it('dựng story và og, ghi đúng khoá, đổi ticketKey và xoá hai ảnh cũ', async () => {
    const t = setup();
    t.files.set(`${OLD}/story.png`, Buffer.from('cu')).set(`${OLD}/og.png`, Buffer.from('cu'));
    t.itineraries.swapTicketKey.mockResolvedValue(OLD);
    await t.service.generate(job);
    expect(t.renderer.render.mock.calls.map((call) => call[1]).sort()).toEqual(['og', 'story']);
    expect(t.files.get(key('story'))).toEqual(Buffer.from('png-story'));
    expect(t.files.get(key('og'))).toEqual(Buffer.from('png-og'));
    expect(t.itineraries.swapTicketKey).toHaveBeenCalledWith(ID, `tickets/${hash}`);
    expect(t.storage.remove).toHaveBeenCalledWith([`${OLD}/story.png`, `${OLD}/og.png`]);
    expect([...t.files.keys()].sort()).toEqual([key('og'), key('story')]);
    for (const [written] of t.storage.write.mock.calls) {
      expect(written).toMatch(/^tickets\/[0-9a-f]{32}\/(story|og)\.png$/);
      expect(written).not.toContain(ID);
    }
  });
  it('đã có đủ hai ảnh thì không dựng lại, vẫn đổi ticketKey', async () => {
    const t = setup();
    t.files.set(key('story'), Buffer.from('co')).set(key('og'), Buffer.from('co'));
    await t.service.generate(job);
    expect(t.renderer.render).not.toHaveBeenCalled();
    expect(t.itineraries.swapTicketKey).toHaveBeenCalledWith(ID, `tickets/${hash}`);
  });
  it('không xoá khi chưa có khoá cũ hoặc khoá cũ trùng khoá mới', async () => {
    const t = setup();
    await t.service.generate(job);
    t.itineraries.swapTicketKey.mockResolvedValue(`tickets/${hash}`);
    await t.service.generate(job);
    expect(t.storage.remove).not.toHaveBeenCalled();
    expect(t.files.has(key('og'))).toBe(true);
  });
  it('từ chối job sai hash bằng InvalidTicketJob', async () => {
    const t = setup();
    await expect(t.service.generate({ ...job, hash: 'f'.repeat(32) })).rejects.toBeInstanceOf(InvalidTicketJob);
    expect(t.renderer.render).not.toHaveBeenCalled();
    expect(t.itineraries.swapTicketKey).not.toHaveBeenCalled();
  });
});
