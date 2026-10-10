import { searchKey } from '@ranhduong/geo';

export function addPlace(ids: readonly string[], id: string): string[] {
  return ids.includes(id) || ids.length >= 50 ? [...ids] : [...ids, id];
}
export function removePlace(ids: readonly string[], id: string): string[] { return ids.filter((value) => value !== id); }
export function movePlace(ids: readonly string[], index: number, direction: -1 | 1): string[] {
  const result = [...ids];
  const target = index + direction;
  const currentId = result[index];
  const targetId = result[target];
  if (currentId !== undefined && targetId !== undefined) {
    result[target] = currentId;
    result[index] = targetId;
  }
  return result;
}
export function filterCandidates<T extends { id: string; name: string; status: string }>(places: readonly T[], selected: readonly string[], q: string): T[] {
  const query = searchKey(q);
  const chosen = new Set(selected);
  return places.filter((place) => place.status === 'active' && !chosen.has(place.id) && searchKey(place.name).includes(query));
}
