import { describe, expect, it } from 'vitest';
import { resistDrag, settleSnap, sheetHeights } from './map-sheet';

const heights = sheetHeights(844, 100, 72);

describe('sheetHeights', () => {
  it('thu gọn chỉ còn phần đầu, nửa màn hình, mở rộng chừa header và dòng ghi nguồn bản đồ', () => {
    expect(heights).toEqual({ collapsed: 72, half: 422, expanded: 704 });
  });
  it('màn hình thấp (xoay ngang) vẫn giữ thứ tự thu gọn ≤ nửa ≤ mở rộng', () => {
    expect(sheetHeights(400, 100, 72)).toEqual({ collapsed: 72, half: 200, expanded: 260 });
    expect(sheetHeights(200, 100, 72)).toEqual({ collapsed: 72, half: 72, expanded: 72 });
  });
  it('reserves the actual attribution height when it wraps on a narrow screen', () => {
    expect(sheetHeights(844, 138, 140, 96)).toEqual({ collapsed: 140, half: 422, expanded: 610 });
  });
  it('retains list space with the compact landscape header and sheet controls', () => {
    const compact = sheetHeights(320, 138, 46, 56);
    expect(compact.expanded - compact.collapsed).toBeGreaterThanOrEqual(80);
    const expanded = sheetHeights(320, 92, 46, 56);
    expect(expanded.expanded - expanded.collapsed).toBeGreaterThanOrEqual(120);
  });
});

describe('settleSnap', () => {
  it('thả tay chậm thì về mức gần nhất', () => {
    expect(settleSnap(300, 0, heights)).toBe('half');
    expect(settleSnap(600, 0.1, heights)).toBe('expanded');
    expect(settleSnap(150, -0.1, heights)).toBe('collapsed');
  });
  it('vuốt nhanh thì sang mức kế tiếp theo hướng vuốt', () => {
    expect(settleSnap(300, 0.8, heights)).toBe('half');
    expect(settleSnap(450, 0.8, heights)).toBe('expanded');
    expect(settleSnap(450, -0.8, heights)).toBe('half');
    expect(settleSnap(400, -0.8, heights)).toBe('collapsed');
  });
  it('vuốt quá mức cao nhất hoặc thấp nhất thì dừng ở mức đó', () => {
    expect(settleSnap(720, 1.2, heights)).toBe('expanded');
    expect(settleSnap(60, -1.2, heights)).toBe('collapsed');
  });
});

describe('resistDrag', () => {
  it('kéo quá giới hạn thì chỉ đi thêm 30% quãng kéo', () => {
    expect(resistDrag(800, heights)).toBeCloseTo(732.8);
    expect(resistDrag(40, heights)).toBeCloseTo(62.4);
    expect(resistDrag(300, heights)).toBe(300);
  });
});
