import { AdminPlace } from '@ranhduong/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import * as media from '@/entities/media/api/media';
import { usePhotoUpload } from './use-photo-upload';

vi.mock('@/entities/media/api/media', () => ({ requestUpload: vi.fn(), putPhoto: vi.fn(), completeUpload: vi.fn(), uploadStatus: vi.fn(), attachPhoto: vi.fn() }));
const ID = '0123456789abcdef01234567';
const UPLOAD_ID = 'd91b94b0-0b88-4e0e-a633-2a4ab8b4c923';
const PLACE = AdminPlace.parse({ id: ID, name: 'Quán Giả Lập', slug: 'quan-gia-lap', status: 'draft', category: 'cafe', aliases: [], tags: [], openingHours: [], bestTime: [], transport: [], contact: {}, ids: {}, photos: [], updatedAt: '2026-10-09T00:00:00.000Z' });
beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.useFakeTimers();
  vi.mocked(media.requestUpload).mockResolvedValue({ uploadId: UPLOAD_ID, url: 'http://r2.gia-lap.example/upload', headers: { 'Content-Type': 'image/png' }, expiresAt: '2026-10-09T23:00:00.000Z' });
  vi.mocked(media.completeUpload).mockResolvedValue({ uploadId: UPLOAD_ID, status: 'queued' });
  vi.mocked(media.uploadStatus).mockResolvedValue({ uploadId: UPLOAD_ID, status: 'ready' });
  vi.mocked(media.attachPhoto).mockResolvedValue(PLACE);
});
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); vi.unstubAllGlobals(); });
function setup(id: string | null = ID) {
  const scope = effectScope();
  const attached = vi.fn();
  const uploader = scope.run(() => usePhotoUpload(() => id, attached));
  if (!uploader) throw new Error('Không tạo được uploader');
  uploader.file.value = new File(['ảnh giả lập'], 'gia-lap.png', { type: 'image/png' });
  uploader.source.value = 'owner';
  uploader.credit.value = 'Quán Giả Lập';
  uploader.license.value = 'Được quán cho phép';
  return { uploader, attached, scope };
}
describe('S06 uploader', () => {
  it('giữ upload đã tải trên máy để tiếp tục sau đăng nhập hoặc quay lại trang', async () => {
    const first = setup();
    vi.mocked(media.attachPhoto).mockRejectedValueOnce(new Error('Phiên hết hạn giả lập'));
    const pending = first.uploader.upload();
    await vi.advanceTimersByTimeAsync(1600);
    await pending;
    first.scope.stop();
    const second = setup();
    expect(second.uploader.canResume.value).toBe(true);
    const retry = second.uploader.resume();
    await vi.advanceTimersByTimeAsync(1600);
    await retry;
    expect(media.putPhoto).toHaveBeenCalledTimes(1);
    expect(second.attached).toHaveBeenCalledWith(PLACE);
  });
  it('thiếu nguồn hoặc loại file sai thì không gọi API; place mới phải lưu trước', async () => {
    const { uploader } = setup();
    uploader.source.value = '';
    await uploader.upload();
    expect(media.requestUpload).not.toHaveBeenCalled();
    expect(uploader.message.value).toMatch(/nguồn/);
    uploader.source.value = 'owner';
    uploader.file.value = new File(['giả lập'], 'gia-lap.gif', { type: 'image/gif' });
    await uploader.upload();
    expect(media.requestUpload).not.toHaveBeenCalled();
    await setup(null).uploader.upload();
    expect(media.requestUpload).not.toHaveBeenCalled();
  });
  it('PUT trực tiếp rồi complete, chờ ready mới attach; callback nhận ảnh đã gắn', async () => {
    const { uploader, attached } = setup();
    const promise = uploader.upload();
    await vi.advanceTimersByTimeAsync(1600);
    await promise;
    expect(media.putPhoto).toHaveBeenCalledWith(expect.objectContaining({ uploadId: UPLOAD_ID }), uploader.file.value, expect.any(AbortSignal));
    expect(media.attachPhoto).toHaveBeenCalledWith(ID, UPLOAD_ID);
    expect(attached).toHaveBeenCalledWith(PLACE);
    expect(uploader.message.value).toBe('Đã thêm ảnh.');
    expect(uploader.busy.value).toBe(false);
  });
  it('upload bị worker từ chối thì báo lỗi và không attach', async () => {
    const { uploader, attached } = setup();
    vi.mocked(media.uploadStatus).mockResolvedValue({ uploadId: UPLOAD_ID, status: 'failed', message: 'Ảnh bị hỏng.' });
    const promise = uploader.upload();
    await vi.advanceTimersByTimeAsync(1600);
    await promise;
    expect(uploader.message.value).toBe('Ảnh bị hỏng.');
    expect(attached).not.toHaveBeenCalled();
  });
  it('attach mất mạng: thử lại cùng upload, không PUT lại', async () => {
    const { uploader } = setup();
    vi.mocked(media.attachPhoto).mockRejectedValueOnce(new Error('Mất mạng giả lập'));
    const first = uploader.upload();
    await vi.advanceTimersByTimeAsync(1600);
    await first;
    expect(uploader.canResume.value).toBe(true);
    const retry = uploader.resume();
    await vi.advanceTimersByTimeAsync(1600);
    await retry;
    expect(media.putPhoto).toHaveBeenCalledTimes(1);
    expect(media.attachPhoto).toHaveBeenCalledTimes(2);
  });
  it('rời trang ngừng polling và không gọi callback sau khi đã đóng component', async () => {
    const { uploader, scope, attached } = setup();
    vi.mocked(media.uploadStatus).mockResolvedValue({ uploadId: UPLOAD_ID, status: 'queued' });
    const promise = uploader.upload();
    await vi.advanceTimersByTimeAsync(100);
    scope.stop();
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
    expect(attached).not.toHaveBeenCalled();
    expect(media.attachPhoto).not.toHaveBeenCalled();
  });
});
