import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import type { ItineraryDay } from '~/entities/itinerary/lib/itinerary-summary';
import { actionBarMode, activeStopKey, dayOfStop, findStop, firstLocatedKey } from './active-stop';

const stop = (key: string, located = true, hasPlace = true): ItineraryPublicStop => ({
  key, number: 1, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit',
  place: hasPlace ? { slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: false,
    ...(located ? { location: { type: 'Point' as const, coordinates: [108.44, 11.94] as [number, number] } } : {}) } : null,
});
const days: ItineraryDay[] = [{ day: 1, stops: [stop('1-1'), stop('1-2')] }, { day: 2, stops: [stop('2-1', false), stop('2-2')] }, { day: 3, stops: [] }];

describe('activeStopKey', () => {
  const rows = [{ key: '1-1', top: 100 }, { key: '1-2', top: 400 }, { key: '2-1', top: 900 }];
  it('lấy vòng số cuối cùng đã đi qua vạch', () => {
    expect(activeStopKey(rows, 420)).toBe('1-2');
    expect(activeStopKey(rows, 400)).toBe('1-2');
  });
  it('chưa tới điểm nào thì là điểm đầu; qua hết thì là điểm cuối; không có điểm thì null', () => {
    expect(activeStopKey(rows, 50)).toBe('1-1');
    expect(activeStopKey(rows, 5000)).toBe('2-1');
    expect(activeStopKey([], 300)).toBeNull();
  });
});

describe('dayOfStop, findStop', () => {
  it('tìm ngày và điểm theo key; key lạ hoặc null thì undefined', () => {
    expect(dayOfStop(days, '2-2')).toBe(2);
    expect(dayOfStop(days, 'x')).toBeUndefined();
    expect(dayOfStop(days, null)).toBeUndefined();
    expect(findStop(days, '1-2')?.key).toBe('1-2');
    expect(findStop(days, null)).toBeUndefined();
  });
});

describe('firstLocatedKey', () => {
  it('bỏ qua điểm chưa có vị trí hoặc không còn công khai; ngày rỗng thì null', () => {
    expect(firstLocatedKey(days[1]!.stops)).toBe('2-2');
    expect(firstLocatedKey([stop('a', false), stop('b', true, false)])).toBeNull();
    expect(firstLocatedKey([])).toBeNull();
  });
});

describe('actionBarMode', () => {
  it('điểm có vị trí thì luôn chỉ đường', () => {
    expect(actionBarMode(stop('a'), { mapVisible: true, canShowMap: true })).toBe('directions');
  });
  it('điểm chưa có vị trí: mở bản đồ ngày khi bản đồ chưa hiện, còn lại chỉ báo chưa có vị trí', () => {
    expect(actionBarMode(stop('b', false), { mapVisible: false, canShowMap: true })).toBe('show-map');
    expect(actionBarMode(stop('b', false), { mapVisible: true, canShowMap: true })).toBe('no-location');
    expect(actionBarMode(stop('c', true, false), { mapVisible: false, canShowMap: false })).toBe('no-location');
    expect(actionBarMode(null, { mapVisible: false, canShowMap: true })).toBe('show-map');
  });
});
