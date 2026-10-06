import { describe, expect, it } from 'vitest';
import { estimateTravelMinutes, haversineMeters, jaroWinkler, normalizeName, slugify } from './index.js';

describe('normalizeName', () => {
  it('bỏ dấu, bỏ từ chung', () => {
    expect(normalizeName('Tiệm Cà Phê Mây Đà Lạt')).toBe('may');
    expect(normalizeName('May Coffee Dalat')).toBe('may');
  });
  it('đổi & thành va', () => {
    expect(normalizeName('Bánh căn & Sữa đậu')).toBe('banh can va sua dau');
  });
});

describe('slugify', () => {
  it('tạo slug không dấu', () => {
    expect(slugify('Đồi chè Cầu Đất')).toBe('doi-che-cau-dat');
  });
});

describe('jaroWinkler', () => {
  it('giống hệt bằng 1, khác hẳn gần 0', () => {
    expect(jaroWinkler('may', 'may')).toBe(1);
    expect(jaroWinkler('abc', 'xyz')).toBe(0);
  });
  it('tên gần giống có điểm cao', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2);
  });
});

describe('khoảng cách', () => {
  const center = { lat: 11.9404, lng: 108.4583 };
  it('cùng điểm bằng 0', () => {
    expect(haversineMeters(center, center)).toBe(0);
  });
  it('ước lượng phút luôn ít nhất 1', () => {
    expect(estimateTravelMinutes(center, center)).toBe(1);
  });
});
