import { describe, expect, it } from 'vitest';
import { CuratedListEditInput } from './curated-list.js';

const id = '0123456789abcdef01234567';
describe('CuratedListEditInput', () => {
  it('trims text and preserves the ordered unique IDs', () => {
    expect(CuratedListEditInput.parse({ title: '  Danh sách Giả Lập  ', description: '  Ghi chú  ', placeIds: [id], status: 'published' }))
      .toEqual({ title: 'Danh sách Giả Lập', description: 'Ghi chú', placeIds: [id], status: 'published' });
  });
  it('allows an empty draft but requires places for publication', () => {
    expect(CuratedListEditInput.safeParse({ title: 'Nháp Giả Lập', description: '', placeIds: [], status: 'draft' }).success).toBe(true);
    expect(CuratedListEditInput.safeParse({ title: 'Giả Lập', description: '', placeIds: [], status: 'published' }).success).toBe(false);
  });
  it('rejects duplicate IDs, invalid IDs and oversized text/lists', () => {
    const input = { title: 'Giả Lập', description: '', placeIds: [id], status: 'draft' };
    for (const extra of [{ title: ' ' }, { title: 'a'.repeat(201) }, { description: 'a'.repeat(2001) },
      { placeIds: [id, id] }, { placeIds: ['invalid'] }, { placeIds: Array.from({ length: 51 }, (_, i) => i.toString(16).padStart(24, '0')) }]) {
      expect(CuratedListEditInput.safeParse({ ...input, ...extra }).success).toBe(false);
    }
  });
});
