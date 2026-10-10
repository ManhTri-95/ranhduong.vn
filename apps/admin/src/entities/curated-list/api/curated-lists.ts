import { AdminCuratedList, AdminCuratedListResponse, type CuratedListEditInput } from '@ranhduong/contracts';
import { api } from '@/shared/api/client';

export async function fetchCuratedLists(city: string): Promise<AdminCuratedList[]> {
  return AdminCuratedListResponse.parse(await api(`/admin/cities/${city}/curated-lists`)).items;
}
export async function fetchCuratedList(id: string): Promise<AdminCuratedList> {
  return AdminCuratedList.parse(await api(`/admin/curated-lists/${id}`));
}
export async function createCuratedList(city: string, input: CuratedListEditInput): Promise<AdminCuratedList> {
  return AdminCuratedList.parse(await api(`/admin/cities/${city}/curated-lists`, { method: 'POST', body: input }));
}
export async function updateCuratedList(id: string, input: CuratedListEditInput): Promise<AdminCuratedList> {
  return AdminCuratedList.parse(await api(`/admin/curated-lists/${id}`, { method: 'PUT', body: input }));
}
