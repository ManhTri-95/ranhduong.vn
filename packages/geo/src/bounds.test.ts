import { describe, expect, it } from 'vitest';
import { boundsOf } from './bounds.js';

describe('boundsOf', () => {
  it('một điểm, không nới: khung suy biến tại điểm đó', () => {
    expect(boundsOf([[1, 2]])).toEqual([1, 2, 1, 2]);
  });
  it('khung bao nhiều điểm, nới đều mỗi phía', () => {
    expect(boundsOf([[1, 2], [3, 0.5], [2, 4]], 0.02)).toEqual([0.98, 0.48, 3.02, 4.02]);
  });
  it('làm tròn 6 chữ số thập phân để tránh sai số dấu phẩy động', () => {
    expect(boundsOf([[108.36, 11.83]], 0.02)).toEqual([108.34, 11.81, 108.38, 11.85]);
  });
  it('ném lỗi khi không có điểm nào', () => {
    expect(() => boundsOf([])).toThrow();
  });
});
