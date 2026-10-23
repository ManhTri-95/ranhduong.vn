import { describe, expect, it } from 'vitest';
import type { PlaceCard } from '@ranhduong/contracts';
import { collectionMapPlaces } from './collection-map';

const place = (slug: string): PlaceCard => ({ slug, name: `Địa điểm Giả Lập ${slug}`, category: 'cafe', openingHours: [], unconfirmed: true });
const located = (slug: string): PlaceCard => ({ ...place(slug), location: { type: 'Point', coordinates: [108.4, 11.9] } });

describe('collectionMapPlaces', () => {
  it('keeps collection order and content while joining real locations by slug', () => {
    const collection = [{ ...place('second'), note: 'Ghi chú Giả Lập' }, place('first')];
    const result = collectionMapPlaces(collection, [located('first'), { ...located('second'), name: 'Tên khác Giả Lập' }, located('unrelated')]);
    expect(result.map(item => item.slug)).toEqual(['second', 'first']);
    expect(result[0]).toMatchObject({ name: collection[0]!.name, note: 'Ghi chú Giả Lập', location: located('second').location });
    expect(collection[0]).not.toHaveProperty('location');
  });
  it('retains missing-coordinate entries so marker numbering never shifts', () => {
    const result = collectionMapPlaces([place('missing'), place('found')], [located('found')]);
    expect(result.map(item => Boolean(item.location))).toEqual([false, true]);
  });
  it('uses existing collection coordinates, and handles an empty collection', () => {
    expect(collectionMapPlaces([located('found')], [])[0]?.location).toEqual(located('found').location);
    expect(collectionMapPlaces([], [located('unrelated')])).toEqual([]);
  });
});
