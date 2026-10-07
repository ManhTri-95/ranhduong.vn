import type { PlaceCard } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  appendUnique,
  isIndexableListing,
  listingApiParams,
  listingHref,
  parseListingQuery,
  placeListKey,
  toggleTag,
} from './listing-query';

describe('parseListingQuery', () => {
  it('không có gì thì không lọc, trang đầu', () => {
    expect(parseListingQuery({})).toEqual({ tags: [] });
  });
  it('thẻ cách nhau dấu phẩy hoặc lặp khoá; bỏ trùng, sắp a-z', () => {
    expect(parseListingQuery({ tags: 'view-doi,chill' })).toEqual({ tags: ['chill', 'view-doi'] });
    expect(parseListingQuery({ tags: ['view-doi', 'chill,view-doi', null] })).toEqual({ tags: ['chill', 'view-doi'] });
    expect(parseListingQuery({ tags: ' chill , ,' })).toEqual({ tags: ['chill'] });
  });
  it('bỏ thẻ sai định dạng và phần quá 10 thẻ thay vì báo lỗi', () => {
    expect(parseListingQuery({ tags: 'View-Doi,sống-ảo,a b,chill,<script>' })).toEqual({ tags: ['chill'] });
    const many = Array.from({ length: 15 }, (_, i) => `the-${String(i).padStart(2, '0')}`).join(',');
    expect(parseListingQuery({ tags: many }).tags).toHaveLength(10);
  });
  it('giữ cursor đúng định dạng, bỏ cursor sai hoặc rỗng; lặp khoá thì lấy cái đầu', () => {
    expect(parseListingQuery({ cursor: '1.-.quan-gia-lap' })).toEqual({ tags: [], cursor: '1.-.quan-gia-lap' });
    for (const cursor of ['abc', '', '9.9.9', null]) expect(parseListingQuery({ cursor }), String(cursor)).toEqual({ tags: [] });
    expect(parseListingQuery({ cursor: ['1.-.a', '0.-.b'] })).toEqual({ tags: [], cursor: '1.-.a' });
  });
});

describe('thẻ, đường dẫn, index', () => {
  it('toggleTag bật hoặc tắt một thẻ, kết quả sắp a-z, không sửa mảng cũ', () => {
    const tags = ['view-doi'];
    expect(toggleTag(tags, 'chill')).toEqual(['chill', 'view-doi']);
    expect(toggleTag(['chill', 'view-doi'], 'chill')).toEqual(['view-doi']);
    expect(tags).toEqual(['view-doi']);
  });
  it('listingHref ghép thẻ và cursor; không có gì thì là đường dẫn gốc', () => {
    expect(listingHref('/da-lat/ca-phe', [])).toBe('/da-lat/ca-phe');
    expect(listingHref('/da-lat/ca-phe', ['chill', 'view-doi'])).toBe('/da-lat/ca-phe?tags=chill,view-doi');
    expect(listingHref('/da-lat/ca-phe', ['chill'], '1.-.quan-gia-lap')).toBe('/da-lat/ca-phe?tags=chill&cursor=1.-.quan-gia-lap');
    expect(listingHref('/da-lat/ca-phe', [], '0.-.a')).toBe('/da-lat/ca-phe?cursor=0.-.a');
  });
  it('chỉ trang gốc (không lọc thẻ, trang đầu) được index', () => {
    expect(isIndexableListing({ tags: [] })).toBe(true);
    expect(isIndexableListing({ tags: ['chill'] })).toBe(false);
    expect(isIndexableListing({ tags: [], cursor: '0.-.a' })).toBe(false);
  });
  it('query API và key useFetch theo bộ lọc', () => {
    expect(listingApiParams({ tags: [] })).toEqual({ tags: undefined, cursor: undefined });
    expect(listingApiParams({ tags: ['chill', 'view-doi'], cursor: '0.-.a' })).toEqual({ tags: 'chill,view-doi', cursor: '0.-.a' });
    expect(placeListKey('da-lat', { category: 'cafe', tags: 'chill', limit: 20 })).toBe('places:da-lat::cafe::chill::20');
    expect(placeListKey('da-lat', { category: 'cafe', limit: 20 })).not.toBe(
      placeListKey('da-lat', { category: 'cafe', limit: 20, cursor: '0.-.a' }),
    );
  });
});

describe('appendUnique', () => {
  const card = (slug: string): PlaceCard => ({ slug, name: `Quán Giả Lập ${slug}`, category: 'cafe', openingHours: [], unconfirmed: true });
  it('nối trang mới vào cuối, bỏ chỗ đã hiện', () => {
    expect(appendUnique([card('a'), card('b')], [card('b'), card('c')]).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
    expect(appendUnique([], [card('a')]).map((p) => p.slug)).toEqual(['a']);
  });
});
