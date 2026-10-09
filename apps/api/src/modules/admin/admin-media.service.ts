import { Injectable } from '@nestjs/common';
import type { AdminPlace, MediaUploadInput, MediaUploadResponse } from '@ranhduong/contracts';
import { MediaService } from '../media/media.service';
import { PlaceEditorService } from '../places/place-editor.service';
import { PlaceStatusService } from '../places/place-status.service';

/** Điều phối hai module tại tầng admin; media không phụ thuộc places. */
@Injectable()
export class AdminMediaService {
  constructor(private readonly media: MediaService, private readonly editor: PlaceEditorService, private readonly status: PlaceStatusService) {}
  async create(placeId: string, input: MediaUploadInput, email: string): Promise<MediaUploadResponse> {
    const upload = await this.media.create({ ...await this.editor.mediaContext(placeId), email }, input);
    try { await this.editor.mediaContext(placeId); }
    catch (err) { await this.media.deleteForPlace(placeId); throw err; }
    return upload;
  }
  async attach(placeId: string, uploadId: string, email: string): Promise<AdminPlace> {
    const photo = await this.media.readyPhoto(uploadId, placeId, email);
    return this.editor.attachPhoto(placeId, photo);
  }
  async deleteDraft(placeId: string): Promise<void> {
    await this.status.deleteDraft(placeId);
    await this.media.deleteForPlace(placeId);
  }
}
