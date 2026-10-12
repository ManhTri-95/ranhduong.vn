import { describe, expect, it } from 'vitest';
import { mapFilterQuery, rainFilterSelected } from './map-query';
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
});
