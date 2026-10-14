import type { ItineraryPublicStop, ItineraryStopPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { daySpan, itinerarySummary, noteNeedsToggle, summaryLine, type ItineraryDay } from './itinerary-summary';

const place = (zoneName?: string): ItineraryStopPlace => ({
  slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: false,
  location: { type: 'Point', coordinates: [108.44, 11.94] }, ...(zoneName ? { zoneName } : {}),
});
const stop = (key: string, opts: { kind?: 'visit' | 'meal'; zone?: string; empty?: boolean; start?: string; end?: string } = {}): ItineraryPublicStop => ({
  key, number: 1, start: opts.start ?? '08:00', end: opts.end ?? '09:00', travelMinFromPrev: 0, note: '',
  kind: opts.kind ?? 'visit', place: opts.empty ? null : place(opts.zone),
});
const day = (n: number, stops: ItineraryPublicStop[]): ItineraryDay => ({ day: n, stops });

describe('itinerarySummary', () => {
  it('đếm mọi điểm dừng kể cả điểm không còn công khai, bữa ăn và khu vực theo thứ tự ghé', () => {
    const days = [day(1, [stop('1-1', { zone: 'Trung tâm' }), stop('1-2', { kind: 'meal', zone: 'Trung tâm' }), stop('1-3', { empty: true })]),
      day(2, [stop('2-1', { kind: 'meal', zone: 'Phía Nam' })])];
    expect(itinerarySummary(days)).toEqual({ stopCount: 4, mealCount: 2, zones: ['Trung tâm', 'Phía Nam'] });
  });
  it('dòng tổng quan bỏ phần rỗng; lịch trình chưa có điểm thì rỗng', () => {
    expect(summaryLine({ stopCount: 12, mealCount: 4, zones: ['Trung tâm', 'Phía Nam'] })).toBe('12 điểm · 4 bữa ăn · Trung tâm, Phía Nam');
    expect(summaryLine({ stopCount: 4, mealCount: 0, zones: [] })).toBe('4 điểm');
    expect(summaryLine({ stopCount: 0, mealCount: 0, zones: [] })).toBe('');
  });
});

describe('daySpan', () => {
  it('lấy giờ bắt đầu điểm đầu và giờ kết thúc điểm cuối; ngày rỗng thì null', () => {
    expect(daySpan(day(1, [stop('a', { start: '07:00', end: '07:45' }), stop('b', { start: '18:00', end: '20:00' })]))).toEqual({ start: '07:00', end: '20:00' });
    expect(daySpan(day(2, []))).toBeNull();
  });
});

describe('noteNeedsToggle', () => {
  it('chỉ có "Xem thêm" khi dài hơn ngưỡng, tính sau khi bỏ khoảng trắng hai đầu', () => {
    expect(noteNeedsToggle('a'.repeat(90))).toBe(false);
    expect(noteNeedsToggle(` ${'a'.repeat(90)} `)).toBe(false);
    expect(noteNeedsToggle('a'.repeat(91))).toBe(true);
    expect(noteNeedsToggle('a'.repeat(161), 160)).toBe(true);
  });
});
