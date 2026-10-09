import { randomUUID } from 'node:crypto';
import { MAX_PHOTO_BYTES, MediaUploadInput, PHOTO_WIDTHS, photoVariantKey } from '@ranhduong/contracts';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { MEDIA_UPLOAD_MODEL, MediaUploadSchema, type MediaUploadRow } from './schemas/media-upload.schema';

const PLACE = '0123456789abcdef01234567';
const CITY = '1123456789abcdef01234567';
const EMAIL = 'admin-gia-lap@example.com';
const input = MediaUploadInput.parse({ contentType: 'image/png', size: 1024, source: 'owner', credit: 'Quán Giả Lập', license: 'Được quán cho phép' });

describe('S06 MediaService (Mongo thật, R2/queue giả)', () => {
  let db: Awaited<ReturnType<typeof connectTestDb>>;
  let service: MediaService;
  let repo: MediaRepository;
  let bytes: Buffer;
  const storage = { presign: vi.fn(), read: vi.fn(), writeVariant: vi.fn(), deleteOriginal: vi.fn(), deleteVariants: vi.fn() };
  const queue = { enqueue: vi.fn(), hasFailed: vi.fn(), enqueueRemoval: vi.fn() };
  beforeAll(async () => {
    db = await connectTestDb();
    repo = new MediaRepository(db.model(MEDIA_UPLOAD_MODEL, MediaUploadSchema));
    bytes = await sharp({ create: { width: 1600, height: 800, channels: 3, background: '#123456' } }).png().toBuffer();
    service = new MediaService(repo, storage, queue);
  });
  afterAll(async () => { await dropTestDb(db); });
  beforeEach(async () => {
    await db.collection('media_uploads').deleteMany({});
    vi.resetAllMocks();
    storage.presign.mockResolvedValue('http://r2.gia-lap.example/presigned');
    storage.read.mockImplementation(async () => bytes);
  });
  const create = () => service.create({ placeId: PLACE, cityId: CITY, email: EMAIL }, { ...input, size: bytes.length });

  it('job đã failed nhưng Mongo chưa ghi được trạng thái: đọc status đối soát lại từ Redis', async () => {
    const upload = await create();
    await service.complete(upload.uploadId, EMAIL);
    queue.hasFailed.mockResolvedValue(true);
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'failed' });
  });
  it('xoá nháp hủy cả upload chưa gắn, dọn ảnh qua queue và scan không công khai lại', async () => {
    const upload = await create();
    await service.complete(upload.uploadId, EMAIL);
    await service.deleteForPlace(PLACE);
    expect(queue.enqueueRemoval).toHaveBeenCalledWith(upload.uploadId);
    await service.scan(upload.uploadId);
    expect(storage.writeVariant).not.toHaveBeenCalled();
    await service.removeUpload(upload.uploadId);
    expect(storage.deleteVariants).toHaveBeenCalled();
    await expect(service.readyPhoto(upload.uploadId, PLACE, EMAIL)).rejects.toMatchObject({ body: { code: 'CONFLICT' } });
  });
  it('nháp bị xoá ngay lúc scan đang ghi ảnh: scan dọn mọi bản vừa ghi', async () => {
    const upload = await create();
    await service.complete(upload.uploadId, EMAIL);
    storage.writeVariant.mockImplementationOnce(async () => { await service.deleteForPlace(PLACE); });
    await service.scan(upload.uploadId);
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'failed' });
    expect(storage.deleteVariants).toHaveBeenCalled();
  });

  it('presign 5 phút, lưu city/place/nguồn; upload không thể dùng cho place hoặc admin khác', async () => {
    const upload = await create();
    expect(new Date(upload.expiresAt).getTime() - Date.now()).toBeGreaterThan(298_000);
    expect(storage.presign).toHaveBeenCalledWith(expect.any(String), 'image/png', bytes.length);
    await expect(service.status(upload.uploadId, 'ke-la@example.com')).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    await expect(service.readyPhoto(upload.uploadId, PLACE, EMAIL)).rejects.toMatchObject({ body: { code: 'CONFLICT' } });
    await service.complete(upload.uploadId, EMAIL);
    await service.scan(upload.uploadId);
    await expect(service.readyPhoto(upload.uploadId, '2223456789abcdef01234567', EMAIL)).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    const photo = await service.readyPhoto(upload.uploadId, PLACE, EMAIL);
    expect(photo).toMatchObject({ source: 'owner', credit: 'Quán Giả Lập', license: input.license });
    expect(photo.key).toMatch(new RegExp(`^photos/${CITY}/`));
    expect(storage.writeVariant.mock.calls.map(([key]) => key)).toEqual(PHOTO_WIDTHS.map((width) => photoVariantKey(photo.key, width)));
    expect(storage.deleteOriginal).toHaveBeenCalled();
  });
  it('hoàn tất lặp lại dùng cùng jobId; ready scan không ghi đè các bản ảnh', async () => {
    const upload = await create();
    await Promise.all([service.complete(upload.uploadId, EMAIL), service.complete(upload.uploadId, EMAIL)]);
    expect(queue.enqueue.mock.calls.every(([id]) => id === upload.uploadId)).toBe(true);
    await service.scan(upload.uploadId);
    await service.scan(upload.uploadId);
    expect(storage.writeVariant).toHaveBeenCalledTimes(3);
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'ready' });
  });
  it('hết hạn chưa upload thì không enqueue', async () => {
    const upload = await create();
    await db.collection<MediaUploadRow>('media_uploads').updateOne({ _id: upload.uploadId }, { $set: { expiresAt: new Date(0) } });
    await expect(service.complete(upload.uploadId, EMAIL)).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
  it('giả MIME hoặc quá dung lượng bị failed, không sinh ảnh công khai', async () => {
    const upload = await create();
    storage.read.mockResolvedValue(Buffer.alloc(MAX_PHOTO_BYTES));
    await service.complete(upload.uploadId, EMAIL);
    await expect(service.scan(upload.uploadId)).rejects.toThrow();
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'failed' });
    expect(storage.writeVariant).not.toHaveBeenCalled();
    expect(storage.deleteOriginal).toHaveBeenCalled();
  });
  it('lỗi R2/queue tạm thời có thể thử lại, chưa ready cho tới khi mọi bản đã ghi xong', async () => {
    const upload = await create();
    queue.enqueue.mockRejectedValueOnce(new Error('Redis gián đoạn giả lập'));
    await expect(service.complete(upload.uploadId, EMAIL)).rejects.toThrow();
    await service.complete(upload.uploadId, EMAIL);
    storage.writeVariant.mockRejectedValueOnce(new Error('R2 gián đoạn giả lập'));
    await expect(service.scan(upload.uploadId)).rejects.toThrow();
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'queued' });
    await expect(service.readyPhoto(upload.uploadId, PLACE, EMAIL)).rejects.toMatchObject({ body: { code: 'CONFLICT' } });
    await service.scan(upload.uploadId);
    expect(await service.status(upload.uploadId, EMAIL)).toMatchObject({ status: 'ready' });
  });
  it('không tìm thấy upload thì 404', async () => {
    await expect(service.status(randomUUID(), EMAIL)).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
  });
});
