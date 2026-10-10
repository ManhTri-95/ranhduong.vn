import { describe, expect, it } from 'vitest';
import { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { tripJsonLd } from './itinerary-seo';

describe('S17 TouristTrip', () => {
  it('flattens days in saved order, retains repeated public visits, omits unavailable stops', () => {
    const stop = (slug: string | null) => ({ key: 'a', number: 1, start: '08:00', end: '09:00', kind: 'visit', note: '', travelMinFromPrev: 0, place: slug ? { slug, name: `Điểm Giả Lập ${slug}`, category: 'attraction', unconfirmed: false } : null });
    const trip = ItineraryTemplateDetail.parse({ slug: 'mau', title: 'Mẫu Giả Lập', description: '', season: '', style: '', seoTitle: '', seoDescription: '', transport: 'motorbike', pace: 'relaxed', days: [{ day: 1, stops: [stop('a'), stop(null), stop('b')] }, { day: 2, stops: [stop('a')] }] });
    expect(tripJsonLd(trip, 'https://ranhduong.vn', 'da-lat')).toMatchObject({ '@type': 'TouristTrip', itinerary: { '@type': 'ItemList', itemListElement: [{ position: 1, item: { name: 'Điểm Giả Lập a' } }, { position: 2, item: { name: 'Điểm Giả Lập b' } }, { position: 3, item: { name: 'Điểm Giả Lập a' } }] } });
  });
});
