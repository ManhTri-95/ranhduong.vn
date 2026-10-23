import { describe, expect, it } from 'vitest';
import { PlaceDetail } from '@ranhduong/contracts';
import { mapFocusPlace, parseMapFocus, placeMapHref } from './map-focus';

const place = PlaceDetail.parse({
  id: '0123456789abcdef01234567', slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe',
  status: 'active', unconfirmed: true, location: { type: 'Point', coordinates: [108.4, 11.9] },
  photos: [{ key: 'fake/photo', source: 'self', credit: 'Ảnh Giả Lập', license: 'Giấy phép Giả Lập' }],
});
const bounds: [number, number, number, number] = [108, 11, 109, 12];

describe('map place navigation', () => {
  it('accepts only one valid public slug, independently of discovery filters', () => {
    expect(parseMapFocus('quan-gia-lap')).toBe('quan-gia-lap');
    for (const value of [undefined, null, '', '../private', ['quan-gia-lap'], '<script>', 3]) expect(parseMapFocus(value)).toBeUndefined();
    expect(placeMapHref('da-lat', 'quan-gia-lap')).toBe('/da-lat/ban-do?place=quan-gia-lap');
  });
  it('uses the real active public place without synthesizing a matching filtered result', () => {
    expect(mapFocusPlace(place, bounds)).toMatchObject({ slug: 'quan-gia-lap', location: { coordinates: [108.4, 11.9] }, category: 'cafe', unconfirmed: true, coverKey: 'fake/photo' });
    expect(mapFocusPlace(place, bounds)).not.toHaveProperty('contact');
  });
  it('rejects closed, missing, unlocated and out-of-city places', () => {
    expect(mapFocusPlace(null, bounds)).toBeNull();
    expect(mapFocusPlace({ ...place, status: 'closed' }, bounds)).toBeNull();
    expect(mapFocusPlace({ ...place, location: undefined }, bounds)).toBeNull();
    expect(mapFocusPlace({ ...place, location: { type: 'Point', coordinates: [0, 0] } }, bounds)).toBeNull();
  });
});
