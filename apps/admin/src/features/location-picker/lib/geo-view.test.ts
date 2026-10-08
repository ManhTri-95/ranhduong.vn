import { parseLatLng } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { bboxContains, canPinHere, expandBBox, formatLatLng, locationAfterMove, roundLngLat } from './geo-view';

describe('locationAfterMove', () => {
  it('chưa ghim: kéo, phóng to bản đồ để tìm chỗ không tự đặt toạ độ', () => {
    for (const gesture of ['drag', 'zoom', 'program'] as const) {
      expect(locationAfterMove(null, [0.2, 0.2], gesture), gesture).toBeNull();
    }
  });
  it('đã ghim: chỉ kéo bản đồ mới dời ghim; phóng to, thu nhỏ (kể cả khi khung bản đồ đẩy tâm đi) hay bản đồ tự dịch thì giữ nguyên', () => {
    expect(locationAfterMove([0.1, 0.1], [0.2000001234, 0.2], 'drag')).toEqual([0.2, 0.2]);
    expect(locationAfterMove([0.1, 0.1], [0.2, 0.2], 'zoom')).toEqual([0.1, 0.1]);
    expect(locationAfterMove([0.1, 0.1], [0.2, 0.2], 'program')).toEqual([0.1, 0.1]);
  });
});

describe('canPinHere', () => {
  it('chỉ ghim được khi bản đồ đã tải xong, không lỗi và đủ gần để thấy đường, nhà', () => {
    expect(canPinHere({ loaded: true, failed: false, zoom: 15 })).toBe(true);
    expect(canPinHere({ loaded: false, failed: false, zoom: 16 })).toBe(false);
    expect(canPinHere({ loaded: true, failed: true, zoom: 16 })).toBe(false);
    expect(canPinHere({ loaded: true, failed: false, zoom: 14.9 })).toBe(false);
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
