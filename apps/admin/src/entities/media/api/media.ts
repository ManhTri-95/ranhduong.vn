import { AdminPlace, MediaUploadInput, MediaUploadResponse, MediaUploadStatus } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function requestUpload(placeId: string, input: MediaUploadInput): Promise<MediaUploadResponse> {
  return MediaUploadResponse.parse(await api(`/admin/places/${placeId}/photos/upload-url`, { method: 'POST', body: MediaUploadInput.parse(input), retry: 0 }));
}
export async function putPhoto(upload: MediaUploadResponse, file: File, signal: AbortSignal): Promise<void> {
  const response = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: file, credentials: 'omit', signal });
  if (!response.ok) throw new Error('Chưa tải được ảnh. Kiểm tra kết nối rồi thử lại.');
}
export async function completeUpload(id: string): Promise<MediaUploadStatus> {
  return MediaUploadStatus.parse(await api(`/admin/media/${id}/complete`, { method: 'POST' }));
}
export async function uploadStatus(id: string): Promise<MediaUploadStatus> {
  return MediaUploadStatus.parse(await api(`/admin/media/${id}`));
}
export async function attachPhoto(placeId: string, uploadId: string): Promise<AdminPlace> {
  return AdminPlace.parse(await api(`/admin/places/${placeId}/photos`, { method: 'POST', body: { uploadId } }));
}
