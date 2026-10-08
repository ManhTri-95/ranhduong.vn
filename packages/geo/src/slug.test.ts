import { describe, expect, it } from 'vitest';
import { isSlugOf, nextFreeSlug } from './slug.js';

describe('nextFreeSlug', () => {
  it('chưa ai dùng thì giữ gốc; đã dùng thì thêm -2, -3…', () => {
    expect(nextFreeSlug('quan-gia-lap', new Set())).toBe('quan-gia-lap');
    expect(nextFreeSlug('quan-gia-lap', new Set(['quan-gia-lap']))).toBe('quan-gia-lap-2');
    expect(nextFreeSlug('quan-gia-lap', new Set(['quan-gia-lap', 'quan-gia-lap-2']))).toBe('quan-gia-lap-3');
  });
});

describe('isSlugOf', () => {
  it('đúng bằng gốc hoặc gốc-<số>', () => {
    expect(isSlugOf('quan-gia-lap', 'quan-gia-lap')).toBe(true);
    expect(isSlugOf('quan-gia-lap-2', 'quan-gia-lap')).toBe(true);
    expect(isSlugOf('quan-gia-lap-hai', 'quan-gia-lap')).toBe(false);
    expect(isSlugOf('quan-gia-lap-2-3', 'quan-gia-lap')).toBe(false);
    expect(isSlugOf('quan-gia', 'quan-gia-lap')).toBe(false);
  });
});
