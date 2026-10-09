import { z } from 'zod';
import { PhotoSource } from './enums.js';
import { ObjectIdString } from './common.js';

export const MediaPlaceContext = z.object({ placeId: ObjectIdString, cityId: ObjectIdString });
export type MediaPlaceContext = z.infer<typeof MediaPlaceContext>;

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const UPLOAD_URL_TTL_S = 300;
export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PhotoContentType = z.enum(PHOTO_CONTENT_TYPES);
export type PhotoContentType = z.infer<typeof PhotoContentType>;
export const UploadId = z.uuid();
export const CC_LICENSES = ['CC0 1.0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0'] as const;

export const PhotoAttribution = z.object({
  source: PhotoSource,
  credit: z.string().trim().min(1, 'Nhập người giữ bản quyền').max(200),
  license: z.string().trim().min(1, 'Nhập giấy phép hoặc sự cho phép sử dụng').max(300),
  sourceUrl: z.httpUrl().max(2000).optional(),
}).superRefine((photo, ctx) => {
  if (photo.source !== 'cc') return;
  if (!photo.sourceUrl) ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'Ảnh CC phải có đường dẫn trang gốc' });
  if (!CC_LICENSES.some((license) => license === photo.license)) {
    ctx.addIssue({ code: 'custom', path: ['license'], message: 'Chọn CC0, CC BY hoặc CC BY-SA cho phép dùng thương mại' });
  }
});
export type PhotoAttribution = z.infer<typeof PhotoAttribution>;
export const MediaUploadInput = PhotoAttribution.extend({
  contentType: PhotoContentType,
  size: z.number().int().positive().lt(MAX_PHOTO_BYTES, 'Ảnh phải nhỏ hơn 8 MB'),
});
export type MediaUploadInput = z.infer<typeof MediaUploadInput>;
export const MediaUploadResponse = z.object({
  uploadId: UploadId,
  url: z.url({ protocol: /^https?$/ }),
  headers: z.object({ 'Content-Type': PhotoContentType }),
  expiresAt: z.iso.datetime(),
});
export type MediaUploadResponse = z.infer<typeof MediaUploadResponse>;
export const MediaUploadStatus = z.object({
  uploadId: UploadId,
  status: z.enum(['pending', 'queued', 'ready', 'failed']),
  message: z.string().optional(),
});
export type MediaUploadStatus = z.infer<typeof MediaUploadStatus>;
export const MediaAttachInput = z.object({ uploadId: UploadId });
export type MediaAttachInput = z.infer<typeof MediaAttachInput>;
