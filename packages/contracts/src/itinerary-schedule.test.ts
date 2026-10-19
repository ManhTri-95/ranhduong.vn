import { describe, expect, it } from 'vitest';
import { analyzeTemplate } from './itinerary-schedule.js';
import { TemplateEditInput, type TemplatePlace } from './itinerary-admin.js';

const ids = ['111111111111111111111111', '222222222222222222222222'];
const keys = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const now = new Date('2026-10-10T00:00:00Z');
const base = { title: 'Giả Lập', description: '', season: '', style: '', transport: 'motorbike', pace: 'relaxed', startWeekday: 6, seoTitle: '', seoDescription: '' };
const place = (id = ids[0]!, extra: Partial<TemplatePlace> = {}): TemplatePlace => ({ id, name: 'Quán Giả Lập', slug: 'gia-lap', category: 'cafe', alsoCategories: [], status: 'active', location: { type: 'Point', coordinates: [0, 0] }, openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '24:00' })), visitDurationMin: 60, validPhoto: true, lastVerifiedAt: now.toISOString(), ...extra });
const stop = (i = 0, extra = {}) => ({ key: keys[i]!, placeId: ids[i]!, kind: 'visit', note: '', ...extra });
const analyze = (stops = [stop()], overrides = {}, places = [place(), place(ids[1])]) => analyzeTemplate(TemplateEditInput.parse({ ...base, days: [{ startTime: '07:00', stops }], ...overrides }), places, () => 10, now);
const codes = (result: ReturnType<typeof analyze>) => result.issues.map((issue) => issue.code);
describe('S15 schedule and publication diagnostics', () => {
  it('calculates visit/travel times without changing input and wraps weekdays', () => {
    const input = TemplateEditInput.parse({ ...base, days: [{ startTime: '07:00', stops: [stop(), stop(1)] }, { startTime: '08:00', stops: [stop(0, { key: '33333333-3333-4333-8333-333333333333' })] }] });
    const original = JSON.stringify(input);
    const result = analyzeTemplate(input, [place(), place(ids[1])], () => 10, now);
    expect(result.days.map((d) => d.weekday)).toEqual([6, 0]);
    expect(result.days[0]?.stops).toMatchObject([{ start: '07:00', end: '08:00', travelMinFromPrev: 0 }, { start: '08:10', end: '09:10', travelMinFromPrev: 10 }]);
    expect(JSON.stringify(input)).toBe(original);
  });
  it('preserves manual arrival/departure and cascades following times', () => {
    const result = analyze([stop(0, { manualStart: '09:00', manualEnd: '10:15' }), stop(1)]);
    expect(result.days[0]?.stops).toMatchObject([{ start: '09:00', end: '10:15' }, { start: '10:25', end: '11:25' }]);
  });
  it('rejects overlap, travel deficit, reverse times and midnight overflow', () => {
    expect(codes(analyze([stop(), stop(1, { manualStart: '08:05' })]))).toContain('overlap');
    expect(codes(analyze([stop(0, { manualEnd: '06:00' })]))).toContain('invalid_time');
    expect(codes(analyze([stop(0, { manualStart: '23:30' })]))).toContain('invalid_time');
  });
  it('accepts leaving at closing and rejects visits spanning a lunch closure', () => {
    const hours = [{ day: 6, open: '07:00', close: '08:00' }, { day: 6, open: '09:00', close: '12:00' }];
    expect(codes(analyze([stop()], {}, [place(ids[0], { openingHours: hours })]))).not.toContain('outside_hours');
    expect(codes(analyze([stop(0, { durationMin: 180 })], {}, [place(ids[0], { openingHours: hours })]))).toContain('outside_hours');
  });
  it('supports opening hours crossing midnight from the preceding weekday', () => {
    expect(codes(analyze([stop()], { days: [{ startTime: '00:00', stops: [stop()] }] }, [place(ids[0], { openingHours: [{ day: 5, open: '22:00', close: '02:00' }] })]))).not.toContain('outside_hours');
    expect(codes(analyze([stop()], {}, [place(ids[0], { openingHours: [] })]))).toContain('outside_hours');
  });
  it('blocks unavailable/missing places and empty days while draft is only a warning', () => {
    for (const status of ['suspected', 'hidden', 'closed', 'merged'] as const) expect(codes(analyze([stop()], {}, [place(ids[0], { status })]))).toContain('unavailable');
    expect(codes(analyze([stop()], {}, []))).toContain('missing_place');
    expect(codes(analyze([]))).toContain('empty_day');
    const draft = analyze([stop()], {}, [place(ids[0], { status: 'draft' })]);
    expect(draft.issues).toContainEqual(expect.objectContaining({ code: 'draft_place', level: 'warning' }));
    expect(draft.canPublish).toBe(true);
  });
  it('warns on stale verification, invalid photos and missing meals in crossed windows', () => {
    const result = analyze([stop(0, { manualStart: '11:00', manualEnd: '20:00' })], {}, [place(ids[0], { validPhoto: false, lastVerifiedAt: '2020-01-01T00:00:00Z' })]);
    expect(codes(result)).toEqual(expect.arrayContaining(['stale_verification', 'missing_photo', 'missing_lunch', 'missing_dinner']));
    expect(result.canPublish).toBe(true);
    const meal = analyze([stop(0, { kind: 'meal', manualStart: '12:00', manualEnd: '13:00' })]);
    expect(codes(meal)).not.toContain('missing_lunch');
  });
  it('warns only when ending after 21:30 and does not warn for meal windows outside the trip', () => {
    expect(codes(analyze([stop(0, { manualStart: '20:30', manualEnd: '21:30' })]))).not.toContain('late_finish');
    expect(codes(analyze([stop(0, { manualStart: '20:30', manualEnd: '21:35' })]))).toContain('late_finish');
    expect(codes(analyze())).not.toContain('missing_lunch');
  });

  it.each([
    ['10:30', '11:30', 'missing_lunch', false],
    ['13:30', '14:30', 'missing_lunch', false],
    ['11:29', '11:31', 'missing_lunch', true],
    ['13:29', '13:31', 'missing_lunch', true],
    ['17:00', '18:00', 'missing_dinner', false],
    ['20:00', '21:00', 'missing_dinner', false],
    ['17:59', '18:01', 'missing_dinner', true],
    ['19:59', '20:01', 'missing_dinner', true],
  ] as const)('checks the meal boundary for a visit %s–%s', (manualStart, manualEnd, code, missing) => {
    expect(codes(analyze([stop(0, { manualStart, manualEnd })])).includes(code)).toBe(missing);
    expect(codes(analyze([stop(0, { kind: 'meal', manualStart, manualEnd })]))).not.toContain(code);
  });
});
