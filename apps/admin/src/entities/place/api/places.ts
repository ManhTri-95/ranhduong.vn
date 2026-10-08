import {
  AdminPlace,
  AdminPlaceListResponse,
  DuplicateCheckResponse,
  type AdminPlaceSummary,
  type AdminVerifySource,
  type DuplicateCheckInput,
  type DuplicateMatch,
  type PlaceEditInput,
  type PlaceStatusAction,
  type PlaceStatusInput,
  type PlaceVerifyInput,
} from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function fetchPlace(id: string): Promise<AdminPlace> {
  return AdminPlace.parse(await api(`/admin/places/${id}`));
}

/** Tạo nháp từ form. */
export async function createPlace(city: string, input: PlaceEditInput): Promise<AdminPlace> {
  return AdminPlace.parse(await api(`/admin/cities/${city}/places`, { method: 'POST', body: input }));
}

/** Thay toàn bộ trường form (PUT). */
export async function updatePlace(id: string, input: PlaceEditInput): Promise<AdminPlace> {
  return AdminPlace.parse(await api(`/admin/places/${id}`, { method: 'PUT', body: input }));
}

export async function activatePlace(id: string): Promise<AdminPlace> {
  return AdminPlace.parse(await api(`/admin/places/${id}/activate`, { method: 'POST' }));
}

export async function checkDuplicates(city: string, input: DuplicateCheckInput): Promise<DuplicateMatch[]> {
  return DuplicateCheckResponse.parse(await api(`/admin/cities/${city}/places/duplicate-check`, { method: 'POST', body: input })).matches;
}

/** Mọi địa điểm chưa gộp của thành phố cho danh sách (S07). */
export async function fetchPlaces(city: string): Promise<AdminPlaceSummary[]> {
  return AdminPlaceListResponse.parse(await api(`/admin/cities/${city}/places`)).items;
}

/** "Đã xác minh": đặt nguồn xác nhận và ngày xác minh; nháp, chỗ bị nghi ngờ thành đang hiển thị. */
export async function verifyPlace(id: string, verifySource: AdminVerifySource): Promise<AdminPlace> {
  const body: PlaceVerifyInput = { verifySource };
  return AdminPlace.parse(await api(`/admin/places/${id}/verify`, { method: 'POST', body }));
}

/** Ẩn, hiện lại, đánh dấu đã đóng cửa, mở lại. */
export async function changePlaceStatus(id: string, action: PlaceStatusAction): Promise<AdminPlace> {
  const body: PlaceStatusInput = { action };
  return AdminPlace.parse(await api(`/admin/places/${id}/status`, { method: 'POST', body }));
}

/** Xoá hẳn một nháp (API từ chối nếu không còn là nháp). */
export async function deletePlace(id: string): Promise<void> {
  await api(`/admin/places/${id}`, { method: 'DELETE' });
}
