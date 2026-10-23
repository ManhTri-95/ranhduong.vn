import { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { journalPreview } from './journal-preview';

function detail(available: boolean) {
  return ItineraryTemplateDetail.parse({
    slug: 'lich-trinh-gia', title: 'Lịch trình GIẢ', description: '', season: '', style: '', seoTitle: '', seoDescription: '', transport: 'motorbike', pace: 'relaxed',
    days: [1, 2].map(day => ({ day, stops: [1, 2, 3].map(number => ({
      key: `${day}-${number}`, number, kind: 'visit', start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '',
      place: available && number !== 1 ? { slug: `diem-gia-${day}-${number}`, name: `Điểm GIẢ ${day}-${number}`, category: 'cafe', unconfirmed: true } : null,
    })) })),
  });
}
describe('real itinerary journal preview', () => {
  it('uses actual stop numbers, days and times without exposing unavailable places', () => {
    const preview = journalPreview(detail(true));
    expect(preview.map(({ day, stop }) => [day, stop.number, stop.start])).toEqual([[1, 2, '08:00'], [1, 3, '08:00'], [2, 2, '08:00']]);
    expect(preview.every(({ stop }) => stop.place !== null)).toBe(true);
  });
  it('leaves the original itinerary untouched and does not invent stops for empty itineraries', () => {
    const original = detail(true); journalPreview(original);
    expect(original.days[0]?.stops).toHaveLength(3);
    expect(journalPreview(detail(false))).toEqual([]);
  });
});
