import { describe, expect, it } from 'vitest';
import { categoryApiParams, categoryAreaHref, categoryMapHref, categoryMoments, categorySiblingHref, parseCategoryQuery } from './category-guide';
import { discoveryHref, discoveryIndexable } from './discovery-query';

describe('category discovery context', () => {
  it('normalizes supported filters and discards a stale cursor during keyword search', () => {
    const filter = parseCategoryQuery({ q: '  Yên  ', category: 'food', zone: 'trung-tam', tags: 'chill,chill,gia-dinh', rainSafe: 'true', cursor: '0.-.quan-gia-lap-20' }, ['trung-tam']);
    expect(filter).toEqual({ q: 'Yên', tags: ['chill', 'gia-dinh'], category: undefined, zone: 'trung-tam', rainSafe: true, cursor: undefined });
    expect(categoryApiParams('cafe', filter)).toEqual({ category: 'cafe', q: 'Yên', zone: 'trung-tam', tags: 'chill,gia-dinh', rainSafe: 'true', cursor: undefined, limit: 20 });
  });
  it('ignores an area outside the actual city instead of querying a missing area', () => {
    expect(parseCategoryQuery({ zone: 'khong-co' }, ['trung-tam']).zone).toBeUndefined();
    expect(parseCategoryQuery({ zone: ['trung-tam'], rainSafe: 'false' }, ['trung-tam']).zone).toBeUndefined();
  });
  it('keeps filter context in pagination and indexes only the unfiltered first page', () => {
    const filter = parseCategoryQuery({ zone: 'trung-tam', tags: 'chill', rainSafe: 'true', cursor: '0.-.quan-gia-lap-20' }, ['trung-tam']);
    expect(discoveryHref('/da-lat/ca-phe', filter)).toBe('/da-lat/ca-phe?tags=chill&zone=trung-tam&rainSafe=true&cursor=0.-.quan-gia-lap-20');
    expect(discoveryIndexable(filter)).toBe(false);
    expect(discoveryIndexable(parseCategoryQuery({}, []))).toBe(true);
    expect(discoveryIndexable(parseCategoryQuery({ q: 'Yên' }, []))).toBe(false);
  });
  it('carries the real category and filters into map and area discovery', () => {
    const filter = parseCategoryQuery({ q: 'Yên', tags: 'chill', zone: 'trung-tam', rainSafe: 'true' }, ['trung-tam']);
    const map = new URL(categoryMapHref('da-lat', 'cafe', filter), 'https://example.com');
    expect(Object.fromEntries(map.searchParams)).toEqual({ category: 'cafe', rainSafe: 'true', q: 'Yên', zone: 'trung-tam', tags: 'chill' });
    const area = new URL(categoryAreaHref('da-lat', 'phia-nam', 'cafe', filter), 'https://example.com');
    expect(area.pathname).toBe('/da-lat/khu-vuc/phia-nam');
    expect(Object.fromEntries(area.searchParams)).toEqual({ q: 'Yên', tags: 'chill', category: 'cafe', rainSafe: 'true' });
  });
  it('starts a new category interest selection while keeping area and rain shelter', () => {
    const filter = parseCategoryQuery({ q: 'Yên', tags: 'chill', zone: 'trung-tam', rainSafe: 'true' }, ['trung-tam']);
    expect(categorySiblingHref('da-lat', 'food', filter)).toBe('/da-lat/an-uong?zone=trung-tam&rainSafe=true');
  });
  it('offers only known mood filters with positive metadata counts, without assigning photographs', () => {
    expect(categoryMoments([{ slug: 'chill', count: 0 }, { slug: 'gia-dinh', count: 4 }, { slug: 'unknown-tag', count: 9 }])).toEqual([{ slug: 'gia-dinh', label: 'Gia đình', title: 'Một vòng cùng gia đình.', count: 4 }]);
  });
});
