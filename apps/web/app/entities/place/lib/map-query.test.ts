import { describe, expect, it } from 'vitest';
import { mapFilterQuery, rainFilterSelected, parseMapFilters } from './map-query';
describe('S24 map filter URLs', () => {
  it('only selects rain mode from an explicit single true value', () => {
    expect(rainFilterSelected('true')).toBe(true);
    for (const value of [undefined, 'false', 'yes', '', ['true', 'false']]) expect(rainFilterSelected(value)).toBe(false);
  });
  it('preserves the rain chip when choosing or clearing a category', () => {
    expect(mapFilterQuery('food', true)).toEqual({ category: 'food', rainSafe: 'true' });
    expect(mapFilterQuery(undefined, true)).toEqual({ rainSafe: 'true' });
    expect(mapFilterQuery('cafe', false)).toEqual({ category: 'cafe' });
    expect(mapFilterQuery(undefined, false)).toEqual({});
  });
  it('preserves a real search, area and tags when changing the map category', () => {
    expect(mapFilterQuery('cafe', true, { q: '  cà phê  ', zone: 'trung-tam', tags: ['chill', 'view-doi'] })).toEqual({
      category: 'cafe', rainSafe: 'true', q: 'cà phê', zone: 'trung-tam', tags: 'chill,view-doi',
    });
  });
  it('accepts GET tag checkboxes but drops invalid/repeated scalar fields and unknown keys', () => {
    expect(parseMapFilters({ category: ['cafe', 'food'], q: ['a', 'b'], zone: '../bad', tags: ['chill', 'chill', '<bad>', 'view-doi'], price: '1', rainSafe: ['true'] })).toEqual({ category: undefined, q: undefined, zone: undefined, tags: ['chill', 'view-doi'], rainSafe: false });
  });
  it('caps search and tag inputs to API limits without cutting a surrogate pair', () => {
    const result = parseMapFilters({ q: 'x'.repeat(99) + '🌲', tags: Array.from({ length: 15 }, (_, index) => `the-${index}`) });
    expect(result.q).toBe('x'.repeat(99));
    expect(result.tags).toHaveLength(10);
  });
});
