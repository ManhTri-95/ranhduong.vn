import { afterEach, describe, expect, it, vi } from 'vitest';
import { putPhoto } from './media';

afterEach(() => vi.unstubAllGlobals());
describe('PUT ảnh lên R2', () => {
  it('gửi MIME đã ký và byte ảnh trực tiếp, không gửi cookie admin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['giả lập'], 'gia-lap.png', { type: 'image/png' });
    const signal = new AbortController().signal;
    await putPhoto({ uploadId: 'd91b94b0-0b88-4e0e-a633-2a4ab8b4c923', url: 'https://r2.gia-lap.example/upload', headers: { 'Content-Type': 'image/png' }, expiresAt: '2026-10-09T23:00:00.000Z' }, file, signal);
    expect(fetchMock).toHaveBeenCalledWith('https://r2.gia-lap.example/upload', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: file, credentials: 'omit', signal });
  });
});
