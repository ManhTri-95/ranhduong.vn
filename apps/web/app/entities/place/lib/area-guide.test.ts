import { describe, expect, it } from 'vitest';
import { areaApiParams, areaHref, areaIndexable, areaMapHref, areaMoments, parseAreaQuery } from './area-guide';

describe('Local Field Guide query and content', () => {
  it('normalizes supported public filters and clears a search cursor', () => {
    const filter = parseAreaQuery({ q: ' cà phê ', tags: ['view-doi', 'chill,view-doi'], category: 'cafe', rainSafe: 'true', cursor: '0.-.quan-gia-lap' });
    expect(filter).toEqual({ q: 'cà phê', tags: ['chill', 'view-doi'], category: 'cafe', rainSafe: true, cursor: undefined });
    expect(areaApiParams('trung-tam', filter)).toMatchObject({ zone: 'trung-tam', q: 'cà phê', category: 'cafe', rainSafe: 'true', tags: 'chill,view-doi', limit: 20, cursor: undefined });
  });
  it('rejects unsupported categories and keeps existing paging without keyword search', () => {
    const filter = parseAreaQuery({ category: 'stay', rainSafe: 'false', cursor: '0.-.quan-gia-lap', tags: 'Chill,chill' });
    expect(filter.category).toBeUndefined();
    expect(filter.tags).toEqual(['chill']);
    expect(areaApiParams('phia-nam', filter)).toMatchObject({ category: 'cafe,food,attraction,activity', cursor: '0.-.quan-gia-lap', rainSafe: undefined });
  });
  it('retains filter context in area/map links while discarding the old area page cursor', () => {
    const filter = parseAreaQuery({ tags: 'chill', category: 'food', rainSafe: 'true', cursor: '0.-.quan-gia-lap' });
    const other = new URL(areaHref('/da-lat/khu-vuc/phia-nam', { ...filter, cursor: undefined }), 'https://example.com');
    expect(Object.fromEntries(other.searchParams)).toEqual({ tags: 'chill', category: 'food', rainSafe: 'true' });
    const map = new URL(areaMapHref('da-lat', 'phia-nam', filter), 'https://example.com');
    expect(map.pathname).toBe('/da-lat/ban-do');
    expect(map.searchParams.get('zone')).toBe('phia-nam');
    expect(map.searchParams.has('cursor')).toBe(false);
    expect(map.searchParams.get('tags')).toBe('chill');
    expect(areaHref('/area', filter)).toContain('cursor=0.-.quan-gia-lap');
  });
  it('only indexes the unfiltered first page and safely truncates a pasted keyword', () => {
    expect(areaIndexable(parseAreaQuery({}))).toBe(true);
    for (const query of [{ q: 'cafe' }, { category: 'cafe' }, { rainSafe: 'true' }, { tags: 'chill' }, { cursor: '0.-.a' }]) expect(areaIndexable(parseAreaQuery(query))).toBe(false);
    expect(parseAreaQuery({ q: `${'a'.repeat(99)}😀` }).q).toBe('a'.repeat(99));
  });
  it('offers only collections supported by actual known tags, without claiming photo membership', () => {
    const moments = areaMoments([{ slug: 'an-sang', count: 2 }, { slug: 'chill', count: 4 }, { slug: 'arbitrary-tag', count: 1 }]);
    expect(moments.map(item => item.slug)).toEqual(['an-sang', 'chill']);
    // PlaceCard has no tag membership: photos cannot be assigned to a tag collection.
    expect(moments.every(item => !Object.hasOwn(item, 'photo'))).toBe(true);
    expect(areaMoments([])).toEqual([]);
  });
});
