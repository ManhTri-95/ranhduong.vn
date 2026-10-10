import { describe, expect, it } from 'vitest';
import { TemplateEditInput } from './itinerary-admin.js';
const key = '11111111-1111-4111-8111-111111111111';
const input = { title: ' Lịch Giả Lập ', description: ' Ghi chú ', season: '', style: '', transport: 'motorbike', pace: 'relaxed', startWeekday: 6, seoTitle: '', seoDescription: '', days: [{ startTime: '07:00', stops: [] }] };
describe('TemplateEditInput', () => {
  it('trims text and permits incomplete draft days', () => {
    expect(TemplateEditInput.parse(input)).toMatchObject({ title: 'Lịch Giả Lập', description: 'Ghi chú', days: input.days });
  });
  it('bounds days, weekday, duration and times, and rejects duplicate keys', () => {
    const stop = { key, placeId: '0123456789abcdef01234567', kind: 'visit', note: '' };
    for (const patch of [{ days: [] }, { days: Array.from({ length: 6 }, () => input.days[0]) }, { startWeekday: 7 }, { title: ' ' },
      { days: [{ startTime: '25:00', stops: [] }] }, { days: [{ startTime: '07:00', stops: [{ ...stop, durationMin: 0 }] }] },
      { days: [{ startTime: '07:00', stops: [stop, stop] }] }, { days: [{ startTime: '07:00', stops: [{ ...stop, manualStart: '24:00' }] }] }]) {
      expect(TemplateEditInput.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
});
