import { describe, expect, it } from 'vitest';
import { PlaceDetail } from '@ranhduong/contracts';
import { placeJsonLd } from './place-seo';

const place = () => PlaceDetail.parse({ id: '0123456789abcdef01234567', slug: 'gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: ['food'], status: 'active', unconfirmed: true, location: { type: 'Point', coordinates: [108, 11] }, openingHours: [{ day: 6, open: '20:00', close: '02:00' }], ratingAvg: 4.5, ratingCount: 3 });
describe('S17 place structured data', () => {
  it('keeps primary type before secondary, lng/lat and overnight hours', () => {
    expect(placeJsonLd(place(), 'https://ranhduong.vn/da-lat/dia-diem/gia-lap')).toMatchObject({ '@type': ['CafeOrCoffeeShop', 'Restaurant'], geo: { longitude: 108, latitude: 11 }, openingHoursSpecification: [{ dayOfWeek: 'https://schema.org/Saturday', opens: '20:00', closes: '02:00' }], aggregateRating: { ratingValue: 4.5, ratingCount: 3 } });
  });
  it('omits unknown facts and ratings below three reviews', () => {
    const result = placeJsonLd({ ...place(), location: undefined, openingHours: [], ratingCount: 2 }, 'https://ranhduong.vn/gia-lap');
    for (const field of ['geo', 'address', 'aggregateRating', 'openingHoursSpecification', 'telephone']) expect(result).not.toHaveProperty(field);
  });
  it('closed places do not advertise old opening hours', () => {
    expect(placeJsonLd({ ...place(), status: 'closed' }, 'https://ranhduong.vn/gia-lap')).not.toHaveProperty('openingHoursSpecification');
  });
  it('normalizes the domain all-day 00:00–00:00 slot into all-day schema hours', () => {
    expect(placeJsonLd({ ...place(), openingHours: [{ day: 3, open: '00:00', close: '00:00' }] }, 'https://ranhduong.vn/gia-lap')).toMatchObject({ openingHoursSpecification: [{ dayOfWeek: 'https://schema.org/Wednesday', opens: '00:00', closes: '23:59' }] });
  });
  it('preserves a legacy 07:00–07:00 full-day interval across the two civil days', () => {
    expect(placeJsonLd({ ...place(), openingHours: [{ day: 6, open: '07:00', close: '07:00' }] }, 'https://ranhduong.vn/gia-lap')).toMatchObject({ openingHoursSpecification: [{ dayOfWeek: 'https://schema.org/Saturday', opens: '07:00', closes: '00:00' }, { dayOfWeek: 'https://schema.org/Sunday', opens: '00:00', closes: '07:00' }] });
  });
  it('retains midnight closing as next-day 00:00 while normalizing explicit all-day 00:00–24:00', () => {
    expect(placeJsonLd({ ...place(), openingHours: [{ day: 3, open: '20:00', close: '24:00' }, { day: 4, open: '00:00', close: '24:00' }] }, 'https://ranhduong.vn/gia-lap')).toMatchObject({ openingHoursSpecification: [{ opens: '20:00', closes: '00:00' }, { opens: '00:00', closes: '23:59' }] });
  });
});
