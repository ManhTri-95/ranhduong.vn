import type { PlaceCard, PlaceListResponse } from '@ranhduong/contracts';

interface ListingSnapshot { fingerprint: string; items: PlaceCard[]; nextCursor?: string }
export type ListingHistory = Record<string, ListingSnapshot>;
const fingerprint = (page: PlaceListResponse) => JSON.stringify(page);

/** Full query path keeps category/zone/tag pages independent; changed first page invalidates appended data. */
export function restoreListing(history: ListingHistory, path: string, page: PlaceListResponse | null): ListingSnapshot | undefined {
  const saved = Object.hasOwn(history, path) ? history[path] : undefined;
  if (saved && (!page || saved.fingerprint === fingerprint(page))) return saved;
  return undefined;
}

export function saveListing(history: ListingHistory, path: string, page: PlaceListResponse | null, state: { items: PlaceCard[]; nextCursor?: string }): void {
  if (!page) return;
  delete history[path];
  history[path] = { fingerprint: fingerprint(page), items: [...state.items], nextCursor: state.nextCursor };
  const keys = Object.keys(history);
  for (const key of keys.slice(0, Math.max(0, keys.length - 20))) delete history[key];
}
