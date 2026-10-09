import { describe, expect, it } from 'vitest';
import type { PlaceListResponse } from '@ranhduong/contracts';
import { restoreListing, saveListing, type ListingHistory } from './listing-history';

const card = (slug: string) => ({ slug, name: slug, category: 'cafe' as const, openingHours: [], unconfirmed: true });
const first: PlaceListResponse = { items: [card('fake-one')], nextCursor: 'next', tags: [] };
describe('listing history', () => {
  it('restores appended items and cursor for the same path and first page', () => {
    const history: ListingHistory = {};
    saveListing(history, '/da-lat/ca-phe', first, { items: [...first.items, card('fake-two')], nextCursor: 'last' });
    expect(restoreListing(history, '/da-lat/ca-phe', first)?.items).toHaveLength(2);
    expect(restoreListing(history, '/da-lat/ca-phe', first)?.nextCursor).toBe('last');
    expect(restoreListing(history, '/da-lat/ca-phe?tags=chill', first)).toBeUndefined();
  });
  it('invalidates changed first-page content and bounds retained paths', () => {
    const history: ListingHistory = {};
    for (let i = 0; i < 25; i++) saveListing(history, `/fake/${i}`, first, { items: first.items });
    expect(Object.keys(history)).toHaveLength(20);
    expect(restoreListing(history, '/fake/0', first)).toBeUndefined();
    expect(restoreListing(history, '/fake/24', { ...first, items: [card('changed')] })).toBeUndefined();
    expect(restoreListing(history, '/fake/24', null)).toBeDefined();
  });
});
