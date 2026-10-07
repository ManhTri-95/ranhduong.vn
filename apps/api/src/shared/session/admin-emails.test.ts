import { describe, expect, it } from 'vitest';
import { isAllowedAdmin } from './admin-emails';

const ALLOWED = ['quan-tri-gia-lap@example.com'];

describe('isAllowedAdmin', () => {
  it('email trong danh sách, không phân biệt hoa thường và khoảng trắng hai đầu', () => {
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com', ALLOWED)).toBe(true);
    expect(isAllowedAdmin(' Quan-Tri-Gia-Lap@Example.COM ', ALLOWED)).toBe(true);
  });
  it('email gần giống vẫn bị từ chối (không gộp dấu chấm của Gmail, không so theo đuôi)', () => {
    expect(isAllowedAdmin('quantri-gia-lap@example.com', ALLOWED)).toBe(false);
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com.gia-lap.example', ALLOWED)).toBe(false);
    expect(isAllowedAdmin('x.quan-tri-gia-lap@example.com', ALLOWED)).toBe(false);
  });
  it('danh sách trống hoặc email rỗng thì không ai vào được', () => {
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com', [])).toBe(false);
    expect(isAllowedAdmin('', [''])).toBe(false);
  });
});
