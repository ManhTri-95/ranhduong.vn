import { describe, expect, it } from 'vitest';
import { distanceToPolygonM, polygonContains, suggestZones, type Position } from './zones.js';

// Hình vuông giả quanh [0, 0]; A và B chung cạnh x = 1.
const square = (w: number, s: number, e: number, n: number): Position[][] => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const A = { ref: 'a', rings: square(0, 0, 1, 1) };
const B = { ref: 'b', rings: square(1, 0, 2, 1) };

describe('suggestZones', () => {
  it('điểm trong một cụm: gợi ý đúng cụm đó', () => {
    expect(suggestZones([A, B], [0.5, 0.5])).toEqual(['a']);
  });
  it('điểm trên cạnh chung hoặc đỉnh chung: cả hai cụm, theo thứ tự đầu vào', () => {
    expect(suggestZones([A, B], [1, 0.5])).toEqual(['a', 'b']);
    expect(suggestZones([A, B], [1, 1])).toEqual(['a', 'b']);
  });
  it('ngoài mọi cụm: cụm có cạnh gần nhất', () => {
    expect(suggestZones([A, B], [2.3, 0.5])).toEqual(['b']);
    expect(suggestZones([A, B], [-0.1, 0.5])).toEqual(['a']);
  });
  it('chưa có cụm nào: rỗng', () => {
    expect(suggestZones([], [0.5, 0.5])).toEqual([]);
  });
});

describe('polygonContains', () => {
  it('trừ phần lỗ, nhưng điểm nằm trên cạnh lỗ vẫn thuộc polygon', () => {
    const rings: Position[][] = [...square(0, 0, 4, 4), [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]];
    expect(polygonContains(rings, [1.5, 1.5])).toBe(false);
    expect(polygonContains(rings, [3, 3])).toBe(true);
    expect(polygonContains(rings, [1, 1.5])).toBe(true);
  });
});

describe('distanceToPolygonM', () => {
  it('khoảng cách tới cạnh gần nhất, 1° vĩ độ ≈ 111 195 m', () => {
    expect(distanceToPolygonM(square(0, 0, 1, 1), [0.5, 2])).toBeCloseTo(111_195, 0);
  });
});
