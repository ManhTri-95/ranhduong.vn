import { describe, expect, it } from 'vitest';
import { BBox, GeoPoint, GeoPolygon, parseLatLng } from './geojson.js';

const ring = (w: number, s: number, e: number, n: number) => [[w, s], [e, s], [e, n], [w, n], [w, s]];

describe('GeoPoint', () => {
  it('nhận toạ độ [lng, lat]', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [0.001, 0.001] }).success).toBe(true);
  });
  it('từ chối toạ độ đảo thứ tự [lat, lng] khi kinh độ lớn hơn 90 (mọi điểm ở Việt Nam)', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [10, 105] }).success).toBe(false);
  });
  it('từ chối thiếu hoặc thừa phần tử, sai type', () => {
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [1] }).success).toBe(false);
    expect(GeoPoint.safeParse({ type: 'Point', coordinates: [1, 2, 3] }).success).toBe(false);
    expect(GeoPoint.safeParse({ type: 'point', coordinates: [1, 2] }).success).toBe(false);
  });
});

describe('GeoPolygon', () => {
  it('nhận vòng kín', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [ring(0, 0, 1, 1)] }).success).toBe(true);
  });
  it('từ chối vòng chưa khép (điểm cuối khác điểm đầu)', () => {
    const open = ring(0, 0, 1, 1).slice(0, 4);
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [open] }).success).toBe(false);
  });
  it('từ chối vòng dưới 4 điểm và polygon không có vòng nào', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [0, 0]]] }).success).toBe(false);
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [] }).success).toBe(false);
  });
  it('từ chối đỉnh có vĩ độ ngoài [-90, 90]', () => {
    expect(GeoPolygon.safeParse({ type: 'Polygon', coordinates: [ring(0, 0, 1, 95)] }).success).toBe(false);
  });
});

describe('BBox', () => {
  it('nhận [tây, nam, đông, bắc]', () => {
    expect(BBox.safeParse([0, 0, 1, 1]).success).toBe(true);
  });
  it('từ chối tây >= đông hoặc nam >= bắc', () => {
    expect(BBox.safeParse([1, 0, 0, 1]).success).toBe(false);
    expect(BBox.safeParse([0, 1, 1, 0]).success).toBe(false);
  });
});

describe('parseLatLng', () => {
  it('đọc "lat,lng" của Google Sheet thành [lng, lat]', () => {
    expect(parseLatLng('0.2,0.3')).toEqual([0.3, 0.2]);
    expect(parseLatLng(' -0.25 , 0.5 ')).toEqual([0.5, -0.25]);
  });
  it('sai dạng hoặc ngoài phạm vi thì null', () => {
    for (const text of ['', '0.2', '0.2;0.3', 'abc,def', '91,0', '0,181', '0.2,0.3,0.4']) {
      expect(parseLatLng(text), text).toBeNull();
    }
  });
});
