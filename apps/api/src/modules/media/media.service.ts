import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { MediaUploadInput, PhotoAttribution, UPLOAD_URL_TTL_S, photoVariantKey, type MediaUploadResponse, type MediaUploadStatus, type PlacePhoto } from '@ranhduong/contracts';
import { ApiException } from '../../shared/http/api-exception';
import { createPhotoVariants, InvalidPhoto } from './media-image';
import { MediaQueue } from './media.queue';
import { MediaRepository } from './media.repository';
import { MediaStorage } from './media.storage';
import type { MediaUploadRow } from './schemas/media-upload.schema';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly repo: MediaRepository,
    @Inject(MediaStorage) private readonly storage: Pick<MediaStorage, 'presign' | 'read' | 'writeVariant' | 'deleteOriginal' | 'deleteVariants'>,
    @Inject(MediaQueue) private readonly queue: Pick<MediaQueue, 'enqueue' | 'enqueueRemoval' | 'hasFailed'>,
  ) {}
  async create(context: { placeId: string; cityId: string; email: string }, raw: MediaUploadInput): Promise<MediaUploadResponse> {
    const input = MediaUploadInput.parse(raw);
    const uploadId = randomUUID();
    const originalKey = `uploads/${uploadId}`;
    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_S * 1000);
    const url = await this.storage.presign(originalKey, input.contentType, input.size);
    await this.repo.create({ _id: uploadId, ...context, ...input, key: `photos/${context.cityId}/${uploadId}`, originalKey, status: 'pending', expiresAt });
    return { uploadId, url, headers: { 'Content-Type': input.contentType }, expiresAt: expiresAt.toISOString() };
  }
  async status(id: string, email: string): Promise<MediaUploadStatus> {
    let row = await this.owned(id, email);
    if (row.status === 'queued' && await this.queue.hasFailed(id)) {
      await this.fail(id);
      row = await this.owned(id, email);
    }
    return { uploadId: id, status: row.status === 'deleted' ? 'failed' : row.status, message: row.message ?? undefined };
  }
  async complete(id: string, email: string): Promise<MediaUploadStatus> {
    const row = await this.owned(id, email);
    if (row.status === 'ready' || row.status === 'failed' || row.status === 'deleted') return this.status(id, email);
    if (row.status === 'pending' && row.expiresAt.getTime() < Date.now()) {
      throw new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, 'Lượt tải ảnh đã hết hạn. Chọn ảnh và tải lại.');
    }
    // Ghi queued trước enqueue; nếu Redis lỗi, lần gọi complete tiếp theo vẫn enqueue cùng jobId được.
    await this.repo.queued(id);
    await this.queue.enqueue(id);
    return this.status(id, email);
  }
  async readyPhoto(id: string, placeId: string, email: string): Promise<PlacePhoto> {
    const row = await this.owned(id, email);
    if (row.placeId !== placeId) throw this.notFound();
    if (row.status !== 'ready') throw new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Ảnh chưa được xử lý xong.');
    return { key: row.key, ...PhotoAttribution.parse(row) };
  }
  async scan(id: string): Promise<void> {
    const row = await this.repo.find(id);
    if (!row || row.status === 'ready' || row.status === 'failed') return;
    if (row.status === 'deleted') { await this.removeUpload(id); return; }
    try {
      const variants = await createPhotoVariants(await this.storage.read(row.originalKey), row.contentType, row.size);
      for (const variant of variants) await this.storage.writeVariant(photoVariantKey(row.key, variant.width), variant.body);
      const ready = await this.repo.finish(id, 'ready');
      if (!ready && (await this.repo.find(id))?.status === 'deleted') await this.removeUpload(id);
      await this.cleanOriginal(row.originalKey);
    } catch (err) {
      if (err instanceof InvalidPhoto) {
        await this.repo.finish(id, 'failed', err.message);
        await this.cleanOriginal(row.originalKey);
      }
      throw err;
    }
  }
  async fail(id: string): Promise<void> {
    await this.repo.finish(id, 'failed', 'Chưa xử lý được ảnh. Vui lòng tải lại.');
  }
  async deleteForPlace(placeId: string): Promise<void> {
    // Tombstone trước khi enqueue để scan đang chạy không thể chuyển sang ready.
    const rows = await this.repo.cancelForPlace(placeId);
    for (const row of rows) await this.queue.enqueueRemoval(row._id);
  }
  async enqueueRemovals(): Promise<void> {
    for (const row of await this.repo.pendingRemovals()) await this.queue.enqueueRemoval(row._id);
  }
  async removeUpload(id: string): Promise<void> {
    const row = await this.repo.find(id);
    if (!row || row.status !== 'deleted') return;
    await this.storage.deleteOriginal(row.originalKey);
    await this.storage.deleteVariants(row.key);
    await this.repo.removed(id);
  }
  private async cleanOriginal(key: string): Promise<void> {
    try { await this.storage.deleteOriginal(key); }
    catch { this.logger.warn('Chưa xoá được ảnh gốc; lifecycle bucket sẽ dọn ảnh tạm.'); }
  }
  private async owned(id: string, email: string): Promise<MediaUploadRow> {
    const row = await this.repo.find(id);
    if (!row || row.email !== email) throw this.notFound();
    return row;
  }
  private notFound() { return new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lượt tải ảnh.'); }
}
