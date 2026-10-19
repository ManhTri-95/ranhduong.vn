import { describe, expect, it, vi } from 'vitest';
import { canShareTicket, copyTicketLink, loadTicket, shareTicket } from './ticket';

const file = new File(['x'], 've.png', { type: 'image/png' });
const data = { title: 'Lịch trình Giả Lập', url: 'https://ranhduong.vn/da-lat/lich-trinh/gia-lap' };

describe('S30 vé lịch trình trên web', () => {
  it('loadTicket: 200 PNG là ready, 503 là pending, lỗi khác hoặc mạng là failed', async () => {
    const png = new Response(new Blob([new Uint8Array([137, 80])]), { status: 200, headers: { 'content-type': 'image/png' } });
    expect((await loadTicket('u', async () => png)).status).toBe('ready');
    expect((await loadTicket('u', async () => new Response('{}', { status: 503 }))).status).toBe('pending');
    expect((await loadTicket('u', async () => new Response('{}', { status: 404 }))).status).toBe('failed');
    expect((await loadTicket('u', async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }))).status).toBe('failed');
    expect((await loadTicket('u', async () => { throw new TypeError('mạng'); })).status).toBe('failed');
  });
  it('chỉ coi là gửi được file khi có share và canShare nhận file', () => {
    expect(canShareTicket(file, {})).toBe(false);
    expect(canShareTicket(file, { share: async () => {}, canShare: () => false })).toBe(false);
    expect(canShareTicket(file, { share: async () => {}, canShare: () => { throw new Error('x'); } })).toBe(false);
    expect(canShareTicket(file, { share: async () => {}, canShare: () => true })).toBe(true);
  });
  it('shareTicket gửi file kèm câu rủ và link; huỷ không báo thành công', async () => {
    const share = vi.fn(async () => {});
    expect(await shareTicket(file, data, { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Lịch trình Giả Lập', text: 'Mình đi theo lịch này nè, bạn đi chung không? https://ranhduong.vn/da-lat/lich-trinh/gia-lap' });
    expect(await shareTicket(file, data, { share: async () => { throw new DOMException('x', 'AbortError'); } })).toBe('cancelled');
    expect(await shareTicket(file, data, { share: async () => { throw new Error('x'); } })).toBe('failed');
    expect(await shareTicket(file, data, {})).toBe('failed');
  });
  it('copyTicketLink: không có clipboard hoặc bị chặn thì manual', async () => {
    expect(await copyTicketLink('u')).toBe('manual');
    expect(await copyTicketLink('u', async () => { throw new Error('chặn'); })).toBe('manual');
    expect(await copyTicketLink('u', async () => {})).toBe('copied');
  });
});
