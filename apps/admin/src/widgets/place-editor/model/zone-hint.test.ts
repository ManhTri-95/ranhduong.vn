import { describe, expect, it } from 'vitest';
import { zoneHint } from './zone-hint';

const A = { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' };
const B = { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B' };

describe('zoneHint', () => {
  it('chưa chọn cụm, ghim nằm trong một cụm: chọn luôn', () => {
    expect(zoneHint('', [A])).toEqual({ kind: 'select', slug: A.slug });
  });
  it('ghim trên ranh giới hai cụm: để người nhập chọn, trừ khi đã chọn một trong hai', () => {
    expect(zoneHint('', [A, B])).toEqual({ kind: 'boundary', zones: [A, B] });
    expect(zoneHint(B.slug, [A, B])).toEqual({ kind: 'none' });
  });
  it('đã chọn cụm khác cụm chứa ghim: hỏi có đổi không; đã đúng thì thôi', () => {
    expect(zoneHint(B.slug, [A])).toEqual({ kind: 'differs', zone: A });
    expect(zoneHint(A.slug, [A])).toEqual({ kind: 'none' });
  });
  it('không có gợi ý: không làm gì', () => {
    expect(zoneHint('', [])).toEqual({ kind: 'none' });
  });
});
