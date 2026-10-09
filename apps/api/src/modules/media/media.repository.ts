import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MEDIA_UPLOAD_MODEL, type MediaUploadModel, type MediaUploadRow } from './schemas/media-upload.schema';

@Injectable()
export class MediaRepository {
  constructor(@InjectModel(MEDIA_UPLOAD_MODEL) private readonly uploads: MediaUploadModel) {}
  async create(row: Omit<MediaUploadRow, 'createdAt' | 'updatedAt'>): Promise<void> { await this.uploads.create(row); }
  async find(id: string): Promise<MediaUploadRow | null> { return this.uploads.findById(id).lean<MediaUploadRow>(); }
  async queued(id: string): Promise<void> {
    await this.uploads.updateOne({ _id: id, status: 'pending' }, { $set: { status: 'queued' } });
  }
  async finish(id: string, status: 'ready' | 'failed', message?: string): Promise<boolean> {
    const result = await this.uploads.updateOne({ _id: id, status: { $in: ['pending', 'queued'] } }, { $set: { status, ...(message ? { message } : {}) } });
    return result.modifiedCount === 1;
  }
  async cancelForPlace(placeId: string): Promise<MediaUploadRow[]> {
    await this.uploads.updateMany({ placeId }, { $set: { status: 'deleted', message: 'Địa điểm nháp đã được xoá.' }, $unset: { cleanedAt: 1 } });
    return this.uploads.find({ placeId }).lean<MediaUploadRow[]>();
  }
  async pendingRemovals(): Promise<MediaUploadRow[]> {
    return this.uploads.find({ status: 'deleted', cleanedAt: { $exists: false } }).lean<MediaUploadRow[]>();
  }
  async removed(id: string): Promise<void> {
    await this.uploads.updateOne({ _id: id, status: 'deleted' }, { $set: { cleanedAt: new Date() } });
  }
}
