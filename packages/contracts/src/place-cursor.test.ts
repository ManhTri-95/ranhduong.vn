import { describe, expect, it } from 'vitest';
import { encodePlaceCursor, PlaceCursor, type FeaturedKey } from './place-cursor.js';

describe('PlaceCursor', () => {
  it('ghi rồi đọc lại ra đúng khoá, kể cả chỗ chưa xác minh', () => {
    const keys: FeaturedKey[] = [
      { owner: true, verifiedAt: 1759622400000, slug: 'quan-gia-lap' },
      { owner: false, verifiedAt: null, slug: 'diem-gia-lap-2' },
      { owner: false, verifiedAt: 0, slug: 'a' },
    ];
    for (const key of keys) expect(PlaceCursor.parse(encodePlaceCursor(key))).toEqual(key);
  });

  it('định dạng {owner}.{mili giây | -}.{slug}', () => {
    expect(encodePlaceCursor({ owner: true, verifiedAt: 1759622400000, slug: 'quan-gia-lap' })).toBe('1.1759622400000.quan-gia-lap');
    expect(encodePlaceCursor({ owner: false, verifiedAt: null, slug: 'b' })).toBe('0.-.b');
  });

  it('từ chối chuỗi sai định dạng', () => {
    const invalid = [
      '',
      'abc',
      '2.-.a',
      '1.-.',
      '1..a',
      '1.-1.a',
      '1.01.a',
      '1.1.5.a',
      '1.-.Quan',
      '1.-.a_b',
      '1.1234567890123456.a',
      ' 1.-.a',
      '1.-.a\n',
    ];
    for (const s of invalid) expect(PlaceCursor.safeParse(s).success, JSON.stringify(s)).toBe(false);
  });
});
