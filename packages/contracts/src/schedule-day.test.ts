import { describe, expect, it } from 'vitest';
import type { TemplatePlace } from './itinerary-admin.js';
import type { OpeningSlot } from './opening-hours.js';
import { clockMinutes, formatClock, scheduleDay, type ScheduleStop } from './itinerary-schedule.js';

const A = '111111111111111111111111';
const B = '222222222222222222222222';
const MISSING = '333333333333333333333333';
const allDay = Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '24:00' }));
const place = (id: string, openingHours: OpeningSlot[] = allDay): TemplatePlace => ({
  id, name: 'Quán Giả Lập', slug: 'gia-lap', category: 'cafe', alsoCategories: [], status: 'active', location: { type: 'Point', coordinates: [0, 0] },
  openingHours, visitDurationMin: 60, validPhoto: true, lastVerifiedAt: '2026-10-10T00:00:00Z',
});
const stop = (placeId: string): ScheduleStop => ({ placeId, kind: 'visit' });
const run = (stops: ScheduleStop[], hours: Record<string, OpeningSlot[]> = {}, opts: { startTime?: string; freeWaitUntil?: number } = {}) => {
  const places = new Map([A, B].map((id) => [id, place(id, hours[id])]));
  return scheduleDay(stops, { startTime: '07:00', weekday: 6, places, travel: () => 10, ...opts });
};
const hoursFrom = (open: string) => ({ [A]: [{ day: 6, open, close: '22:00' }] });

describe('S35 scheduleDay', () => {
  it('bữa ăn chờ tới notBefore, giữ giờ đến', () => {
    const t = run([stop(A), { ...stop(B), kind: 'meal', notBefore: 690 }]);
    expect(t.stops.map((s) => [s.arrival, s.start, s.end, s.travelMinFromPrev])).toEqual([[420, 420, 480, 0], [490, 690, 750, 10]]);
  });

  it('chờ quán mở trong maxWaitMin, quá thì không chờ và sai giờ', () => {
    expect(run([{ ...stop(A), maxWaitMin: 30 }], hoursFrom('07:30')).stops[0]).toMatchObject({ start: 450, withinHours: true });
    expect(run([{ ...stop(A), maxWaitMin: 30 }], hoursFrom('07:45')).stops[0]).toMatchObject({ start: 420, withinHours: false });
    expect(run([stop(A)], hoursFrom('07:30')).stops[0]).toMatchObject({ start: 420, withinHours: false });
  });

  it('chờ tới ca sau phủ hết thời lượng ghé', () => {
    const split = [{ day: 6, open: '07:00', close: '07:20' }, { day: 6, open: '08:00', close: '12:00' }];
    expect(run([{ ...stop(A), maxWaitMin: 60 }], { [A]: split }).stops[0]?.start).toBe(480);
  });

  it('chờ quán mở tới waitUntil của từng điểm, kể cả quá maxWaitMin', () => {
    const perPlace = { [A]: [{ day: 6, open: '04:00', close: '22:00' }], [B]: [{ day: 6, open: '07:00', close: '22:00' }] };
    const opts = { startTime: '04:45' };
    expect(run([{ ...stop(A), maxWaitMin: 30 }, { ...stop(B), maxWaitMin: 30, waitUntil: 420 }], perPlace, opts).stops[1]).toMatchObject({ arrival: 355, start: 420, withinHours: true });
    expect(run([{ ...stop(A), maxWaitMin: 30 }, { ...stop(B), maxWaitMin: 30 }], perPlace, opts).stops[1]).toMatchObject({ start: 355, withinHours: false });
    expect(run([{ ...stop(B), waitUntil: 360 }], perPlace, opts).stops[0]).toMatchObject({ start: 285, withinHours: false });
  });

  it('giờ sửa tay không bị chờ', () => {
    expect(run([{ ...stop(A), manualStart: '07:00', maxWaitMin: 60 }], hoursFrom('07:30')).stops[0]?.start).toBe(420);
  });

  it('báo thiếu bữa và kết thúc sau 21:30', () => {
    expect(run([{ ...stop(A), manualStart: '11:00', manualEnd: '20:00' }])).toMatchObject({ missingMeals: ['lunch', 'dinner'], lateFinish: false });
    expect(run([{ ...stop(A), manualStart: '20:30', manualEnd: '21:35' }]).lateFinish).toBe(true);
  });

  it('địa điểm thiếu thì không trong giờ và chặng sau không tính di chuyển', () => {
    expect(run([stop(MISSING), stop(A)]).stops.map((s) => [s.withinHours, s.travelMinFromPrev])).toEqual([[false, 0], [true, 0]]);
  });

  it('clockMinutes/formatClock', () => {
    expect([clockMinutes('04:45'), formatClock(1290)]).toEqual([285, '21:30']);
  });
});
