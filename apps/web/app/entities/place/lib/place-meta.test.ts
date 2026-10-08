import { describe, expect, it } from 'vitest';
import { placeMeta } from './place-meta';

describe('placeMeta', () => {
  it('danh mục chính rồi danh mục phụ, rồi cụm', () => {
    expect(placeMeta({ category: 'cafe', alsoCategories: ['food'], zoneName: 'Trung tâm' })).toBe('Cà phê, Ăn uống · Trung tâm');
    expect(placeMeta({ category: 'food', zoneName: 'Phía Nam' })).toBe('Ăn uống · Phía Nam');
    expect(placeMeta({ category: 'attraction' })).toBe('Tham quan');
  });
});
