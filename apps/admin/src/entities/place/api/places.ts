import {
  AdminPlace,
  DuplicateCheckResponse,
  type DuplicateCheckInput,
  type DuplicateMatch,
  type PlaceEditInput,
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
