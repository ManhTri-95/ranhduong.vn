import { describe, expect, it } from 'vitest';
import { TemplateEditInput, TemplateLocalDraft } from './itinerary-admin.js';
import { TripWith } from './trip.js';
const key = '11111111-1111-4111-8111-111111111111';
const input = { title: ' Lịch Giả Lập ', description: ' Ghi chú ', season: '', style: '', transport: 'motorbike', pace: 'relaxed', startWeekday: 6, seoTitle: '', seoDescription: '', days: [{ startTime: '07:00', stops: [] }] };
describe('TemplateEditInput', () => {
  it('defaults legacy templates and local copies to empty interests without inventing an audience', () => {
    for (const schema of [TemplateEditInput, TemplateLocalDraft]) {
      expect(schema.parse(input)).toMatchObject({ tags: [] });
      expect(schema.parse(input).with).toBeUndefined();
    }
  });
  it('accepts up to three distinct interests and each trip audience independently of style', () => {
    for (const withValue of TripWith.options) {
      expect(TemplateEditInput.parse({ ...input, style: 'Phong cách Giả Lập', with: withValue, tags: ['chill_cafe', 'photo_spots', 'clouds_hills'] }))
        .toMatchObject({ style: 'Phong cách Giả Lập', with: withValue, tags: ['chill_cafe', 'photo_spots', 'clouds_hills'] });
    }
  });
  it('rejects excess, duplicate and unknown interests and unknown audiences in API and local drafts', () => {
    for (const schema of [TemplateEditInput, TemplateLocalDraft]) {
      for (const patch of [
        { tags: ['chill_cafe', 'photo_spots', 'clouds_hills', 'nature_adventure'] },
        { tags: ['chill_cafe', 'chill_cafe'] }, { tags: ['chill'] }, { with: 'cap-doi' }, { with: '' },
      ]) expect(schema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
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
