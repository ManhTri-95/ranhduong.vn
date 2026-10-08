import { parseLatLng } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { bboxContains, expandBBox, formatLatLng, locationAfterMove, roundLngLat } from './geo-view';

describe('locationAfterMove', () => {
  it('chưa ghim: phóng to, kéo bản đồ để tìm chỗ không tự đặt toạ độ', () => {
    expect(locationAfterMove(null, [0.2, 0.2], true)).toBeNull();
    expect(locationAfterMove(null, [0.2, 0.2], false)).toBeNull();
  });
  it('đã ghim: người dùng kéo bản đồ thì ghim theo tâm; bản đồ tự dịch (sau khi dán toạ độ) thì giữ nguyên', () => {
    expect(locationAfterMove([0.1, 0.1], [0.2000001234, 0.2], true)).toEqual([0.2, 0.2]);
    expect(locationAfterMove([0.1, 0.1], [0.2, 0.2], false)).toEqual([0.1, 0.1]);
  });
});

describe('khung và toạ độ', () => {
  it('nới khung mỗi phía; kiểm điểm trong khung, tính cả cạnh', () => {
    expect(expandBBox([0, 0, 1, 1], 0.2)).toEqual([-0.2, -0.2, 1.2, 1.2]);
    expect(bboxContains([0, 0, 1, 1], [1, 0.5])).toBe(true);
    expect(bboxContains([0, 0, 1, 1], [0.5, 1.01])).toBe(false);
  });
  it('hiện "lat, lng" 6 chữ số, dán lại đọc ra đúng điểm', () => {
    expect(formatLatLng([0.3, 0.2])).toBe('0.200000, 0.300000');
    expect(parseLatLng(formatLatLng([0.123456, -0.654321]))).toEqual([0.123456, -0.654321]);
  });
  it('làm tròn toạ độ về 6 chữ số thập phân (khoảng 0,1 m)', () => {
    expect(roundLngLat([0.12345678, 0.98765432])).toEqual([0.123457, 0.987654]);
  });
});
