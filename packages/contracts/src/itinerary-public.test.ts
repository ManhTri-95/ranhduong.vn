import { describe, expect, it } from 'vitest';
import { ItineraryTemplateDetail } from './itinerary-public.js';

const detail = () => ({
  slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', description: '', season: '', style: '',
  seoTitle: '', seoDescription: '', transport: 'motorbike', pace: 'relaxed',
  days: [{ day: 1, stops: [{ key: '1-1', number: 1, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit', place: null }] }],
});

describe('ItineraryTemplateDetail', () => {
  it('accepts anonymous unavailable stops and midnight departure', () => {
    const value = detail();
    value.days[0]!.stops[0]!.end = '24:00';
    expect(ItineraryTemplateDetail.safeParse(value).success).toBe(true);
  });
  it.each(['25:00', '08:99', 'bad'])('rejects corrupt stored times: %s', (time) => {
    const value = detail();
    value.days[0]!.stops[0]!.start = time;
    expect(ItineraryTemplateDetail.safeParse(value).success).toBe(false);
  });
  it('strips admin and ownership fields from public output', () => {
    const value = { ...detail(), ownerId: 'private', status: 'draft', analysis: { secret: true } };
    const parsed = ItineraryTemplateDetail.parse(value);
    expect(parsed).not.toHaveProperty('ownerId');
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('analysis');
  });
});
