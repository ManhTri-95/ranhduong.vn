import { formatClock, type ItineraryPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { allDays, fakePlace } from '../../../testing/planner-fixtures';
import { dayStartTime, legMinutes, repairHours, timeStops, toDayStop } from './timing';

// Ngày 1 của fakeRequest là Thứ Hai.
const v = (n: number, overrides: Partial<ItineraryPlace> = {}, score = 0) => toDayStop({ place: fakePlace(n, overrides), score, match: 0 }, 'visit')!;
const names = (stops: readonly { place: ItineraryPlace }[]) => stops.map((s) => s.place.name);

describe('S35 timing', () => {
  it('legMinutes làm tròn 5 phút rồi cộng đệm 10', () => {
    expect(legMinutes(fakePlace(1).location!, fakePlace(2).location!)).toBe(10);
    expect(legMinutes({ type: 'Point', coordinates: [0.1, 0.1] }, { type: 'Point', coordinates: [0.12, 0.1] })).toBe(15);
  });

  it('toDayStop: ghim theo thời điểm đẹp, bỏ điểm thiếu toạ độ, bữa ăn không ghim', () => {
    expect(v(1, { bestTime: ['evening'] }).pin).toBe('last');
    expect(toDayStop({ place: fakePlace(1, { location: undefined }), score: 0, match: 0 }, 'visit')).toBeUndefined();
    expect(toDayStop({ place: fakePlace(1, { bestTime: ['sunrise'] }), score: 0, match: 0 }, 'meal')?.pin).toBeUndefined();
  });

  it('ngày thường từ 07:00, ngày có ghim bình minh từ 04:45', () => {
    expect(timeStops([1, 2, 3, 4].map((n) => v(n)), 1).stops.map((s) => formatClock(s.start))).toEqual(['07:00', '08:10', '09:20', '10:30']);
    const sunrise = v(5, { bestTime: ['sunrise'], openingHours: allDays('04:00', '22:00') });
    expect(dayStartTime([sunrise, v(1)])).toBe('04:45');
    expect(timeStops([sunrise, v(1)], 1).stops.map((s) => s.start)).toEqual([285, 420]); // chờ quán mở 07:00
  });

  it('điểm bình minh chỉ chờ quán mở tới 06:00; mở muộn hơn thì sai giờ và bị bỏ', () => {
    const early = v(5, { bestTime: ['sunrise'], openingHours: allDays('05:30', '22:00') });
    expect(timeStops([early, v(1)], 1).stops[0]).toMatchObject({ start: 330, withinHours: true });
    const late = v(5, { bestTime: ['sunrise'], openingHours: allDays('07:00', '17:00') });
    expect(timeStops([late, v(1)], 1).stops[0]?.withinHours).toBe(false);
    expect(dayStartTime(repairHours([late, v(1)], 1))).toBe('07:00');
  });

  it('điểm ghim cuối chờ tới giờ mở, kể cả ca qua nửa đêm', () => {
    const night = v(6, { bestTime: ['evening'], openingHours: allDays('17:00', '02:00') });
    expect(timeStops([v(1), night], 1).stops[1]).toMatchObject({ start: 1020, withinHours: true });
  });

  it('điểm thường chờ tối đa 30 phút', () => {
    expect(timeStops([v(1, { openingHours: allDays('07:20', '22:00') })], 1).stops[0]).toMatchObject({ start: 440, withinHours: true });
    expect(timeStops([v(1, { openingHours: allDays('07:40', '22:00') })], 1).stops[0]?.withinHours).toBe(false);
  });

  it('sai giờ thì đổi với điểm kề', () => {
    const early = v(2, { openingHours: allDays('07:00', '08:00') });
    expect(names(repairHours([v(1), early], 1))).toEqual(['Điểm Giả Lập 2', 'Điểm Giả Lập 1']);
  });

  it('đổi không hết sai thì bỏ điểm điểm số thấp nhất trong các điểm sai giờ', () => {
    const a = v(1, {}, 0.9);
    const b = v(2, { openingHours: allDays('07:00', '08:00') }, 0.5);
    const c = v(3, { openingHours: allDays('07:00', '08:00') }, 0.1);
    expect(names(repairHours([a, b, c], 1))).toEqual(['Điểm Giả Lập 2', 'Điểm Giả Lập 1']);
  });

  it('không đổi chỗ điểm ghim; ghim bình minh sai giờ thì bị bỏ và ngày bắt đầu 07:00', () => {
    const lateSunrise = v(5, { bestTime: ['sunrise'], openingHours: allDays('08:00', '22:00') }, 0.9);
    const kept = repairHours([lateSunrise, v(1)], 1);
    expect(names(kept)).toEqual(['Điểm Giả Lập 1']);
    expect(dayStartTime(kept)).toBe('07:00');
  });
});
