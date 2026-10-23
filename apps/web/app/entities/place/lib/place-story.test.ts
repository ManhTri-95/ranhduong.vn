import { describe, expect, it } from 'vitest';
import type { PlaceDetail } from '@ranhduong/contracts';
import { coordinateLabel, placeMapCard, travelNotes, visitingMoments } from './place-story';

const place: PlaceDetail = {
  id: '000000000000000000000001', slug: 'dia-diem-gia-lap', name: 'Địa điểm Giả Lập',
  status: 'active', category: 'cafe', alsoCategories: [], tags: [], openingHours: [],
  bestTime: [], transport: [], contact: {}, photos: [], ratingCount: 0, unconfirmed: true,
};

describe('authentic place story', () => {
  it('keeps missing costs, shelter and each transport mode explicitly unknown', () => {
    const notes = travelNotes(place);
    expect(notes.find(note => note.key === 'price')?.value).toBe('Chưa rõ mức giá');
    expect(notes.find(note => note.key === 'cover')?.value).toBe('Chưa rõ mái che');
    expect(notes.find(note => note.key === 'motorbike')?.value).toBe('Chưa rõ');
    expect(notes.find(note => note.key === 'car')?.value).toBe('Chưa rõ');
  });

  it('does not turn a relative price into money or absence of a transport mode into a restriction', () => {
    const notes = travelNotes({ ...place, priceLevel: 2, cover: 'partial', transport: ['motorbike'], visitDurationMin: 45 });
    expect(notes.find(note => note.key === 'price')?.value).toBe('Mức 2 / 4');
    expect(notes.find(note => note.key === 'cover')?.value).toBe('Có chỗ che mưa và ngoài trời');
    expect(notes.find(note => note.key === 'motorbike')?.value).toBe('Có trong ghi chép');
    expect(notes.find(note => note.key === 'car')?.value).toBe('Chưa rõ');
    expect(notes.find(note => note.key === 'duration')?.value).toBe('Khoảng 45 phút');
  });

  it('only highlights stored visiting moments, in day order, and never recommends a closed place', () => {
    expect(visitingMoments(place)).toEqual([]);
    const moments = visitingMoments({ ...place, bestTime: ['sunset', 'morning'] });
    expect(moments.filter(moment => moment.recommended).map(moment => moment.key)).toEqual(['morning', 'sunset']);
    expect(visitingMoments({ ...place, status: 'closed', bestTime: ['morning'] })).toEqual([]);
  });

  it('formats actual coordinates, including zero and negative hemispheres, or omits the label', () => {
    expect(coordinateLabel(undefined)).toBeUndefined();
    expect(coordinateLabel({ type: 'Point', coordinates: [0, 0] })).toBe('0.0000° B / 0.0000° Đ');
    expect(coordinateLabel({ type: 'Point', coordinates: [-108.4, -11.9] })).toBe('11.9000° N / 108.4000° T');
  });

  it('reuses only an active located place for the existing map without requesting substitute geography', () => {
    expect(placeMapCard(place)).toBeUndefined();
    const located = { ...place, location: { type: 'Point' as const, coordinates: [108.4, 11.9] as [number, number] } };
    expect(placeMapCard(located)).toMatchObject({ slug: place.slug, location: located.location, unconfirmed: true, openingHours: [] });
    expect(placeMapCard({ ...located, status: 'closed' })).toBeUndefined();
  });
});
