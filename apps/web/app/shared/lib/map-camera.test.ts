import type { BBox } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { needsPan, restorableView, pointBounds, viewportAction } from './map-camera';

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

describe('Living Map viewport intent', () => {
  const area: BBox = [108.3, 11.8, 108.6, 12.1];
  const changed: BBox = [108.4, 11.9, 108.6, 12.1];
  it('loads the first real viewport, offers user-driven searches and ignores selection camera movement', () => {
    expect(viewportAction(false, false, undefined, area)).toBe('load');
    expect(viewportAction(true, true, area, changed)).toBe('offer');
    expect(viewportAction(true, false, area, changed)).toBe('none');
    expect(viewportAction(true, true, area, area)).toBe('none');
  });
  it('ignores sub-metre numerical noise when returning to the searched viewport', () => {
    expect(viewportAction(true, true, area, [108.30000001, 11.8, 108.6, 12.1])).toBe('none');
  });
  it('fits actual finite place points inside city bounds and has no invented fallback point', () => {
    expect(pointBounds([[108.4, 11.9], [108.5, 12], [109, 13], [NaN, 12]], area)).toEqual([108.4, 11.9, 108.5, 12]);
    expect(pointBounds([[108.4, 11.9]], area)).toEqual([108.4, 11.9, 108.4, 11.9]);
    expect(pointBounds([], area)).toBeNull();
  });
});
