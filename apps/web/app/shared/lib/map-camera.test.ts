import type { BBox } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { needsPan, restorableView } from './map-camera';

const size = { width: 390, height: 844 };
const insets = { top: 100, bottom: 422 };

describe('needsPan', () => {
  it('ghim đang nằm trong vùng nhìn thấy thì không dịch bản đồ', () => {
    expect(needsPan({ x: 195, y: 250 }, size, insets)).toBe(false);
  });
  it('ghim bị sheet, header hoặc mép màn hình che thì dịch bản đồ', () => {
    expect(needsPan({ x: 195, y: 500 }, size, insets)).toBe(true);
    expect(needsPan({ x: 195, y: 120 }, size, insets)).toBe(true);
    expect(needsPan({ x: 20, y: 250 }, size, insets)).toBe(true);
    expect(needsPan({ x: 370, y: 250 }, size, insets)).toBe(true);
  });
});

describe('restorableView', () => {
  const bounds: BBox = [108.3, 11.8, 108.6, 12.1];
  it('giữ khung nhìn đã lưu khi tâm nằm trong vùng thành phố và zoom hợp lệ', () => {
    expect(restorableView({ center: [108.44, 11.94], zoom: 14 }, bounds)).toEqual({ center: [108.44, 11.94], zoom: 14 });
  });
  it('bỏ khung nhìn đã lưu nếu thiếu, ngoài vùng hoặc zoom nhỏ hơn mức cho phép', () => {
    expect(restorableView(undefined, bounds)).toBeUndefined();
    expect(restorableView({ center: [106.7, 10.8], zoom: 14 }, bounds)).toBeUndefined();
    expect(restorableView({ center: [108.44, 11.94], zoom: 9 }, bounds)).toBeUndefined();
    expect(restorableView({ center: [108.44, Number.NaN], zoom: 14 }, bounds)).toBeUndefined();
  });
});
