import { describe, expect, it } from 'vitest';
import { PlaceDetailResponse } from './place-detail.js';

describe('public place detail contract', () => {
  const response = { place: { id: '0123456789abcdef01234567', slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', status: 'active', unconfirmed: true }, nearby: [] };
  it('accepts missing optional data and defaults lists', () => {
    const parsed = PlaceDetailResponse.parse(response);
    expect(parsed.place.photos).toEqual([]);
    expect(parsed.place.openingHours).toEqual([]);
    expect(parsed.place.contact).toEqual({});
  });
  it('rejects private statuses, unsafe contacts and photos without attribution', () => {
    for (const status of ['draft', 'hidden', 'suspected', 'merged']) {
      expect(PlaceDetailResponse.safeParse({ ...response, place: { ...response.place, status } }).success).toBe(false);
    }
    expect(PlaceDetailResponse.safeParse({ ...response, place: { ...response.place, contact: { fanpage: 'javascript:alert(1)' } } }).success).toBe(false);
    expect(PlaceDetailResponse.safeParse({ ...response, place: { ...response.place, photos: [{ key: 'fake', source: 'self' }] } }).success).toBe(false);
  });
});
