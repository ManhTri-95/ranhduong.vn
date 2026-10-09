import { describe, expect, it } from 'vitest';
import { directionHref, openingHoursRows, verificationDate } from './place-detail';

describe('place detail helpers', () => {
  it('builds Google Maps directions with lat/lng and optional place ID', () => {
    const place = { status: 'active' as const, location: { type: 'Point' as const, coordinates: [0.2, 0.3] as [number, number] }, googlePlaceId: 'fake & id' };
    const url = new URL(directionHref(place) ?? '');
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('0.3,0.2');
    expect(url.searchParams.get('destination_place_id')).toBe('fake & id');
    expect(new URL(directionHref({ ...place, googlePlaceId: undefined }) ?? '').searchParams.has('destination_place_id')).toBe(false);
    expect(directionHref({ ...place, status: 'closed' })).toBeUndefined();
    expect(directionHref({ status: 'active' })).toBeUndefined();
  });
  it('renders a whole week, sorted shifts, all-day and overnight carryover', () => {
    const rows = openingHoursRows([{ day: 1, open: '22:00', close: '02:00' }, { day: 3, open: '00:00', close: '24:00' }, { day: 4, open: '14:00', close: '18:00' }, { day: 4, open: '07:00', close: '11:00' }]);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ day: 1, label: 'Thứ Hai', text: '22:00–02:00 (hôm sau)' });
    expect(rows[1]?.text).toBe('00:00–02:00 (từ hôm trước)');
    expect(rows[2]?.text).toBe('Mở cả ngày');
    expect(rows[3]?.text).toBe('07:00–11:00, 14:00–18:00');
    expect(rows[4]?.text).toBe('Đóng');
    expect(openingHoursRows([])).toEqual([]);
  });
  it('displays verification dates in Vietnam, including UTC day crossover', () => {
    expect(verificationDate('2026-10-08T18:00:00.000Z')).toBe('09/10/2026');
    expect(verificationDate(undefined)).toBeUndefined();
  });
});
