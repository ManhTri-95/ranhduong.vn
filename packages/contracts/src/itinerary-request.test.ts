import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItineraryRequest, createItineraryRequestSchema } from './itinerary-request.js';
import type { BBox } from './geojson.js';

// Khung và toạ độ giả, không phải dữ liệu địa điểm thực tế.
const bounds: BBox = [10, 20, 11, 21];
const request = {
  days: 1, startDate: '2026-10-19', transport: 'motorbike', with: 'solo', tags: [], pace: 'relaxed',
};
const point = (lng: number, lat: number) => ({ type: 'Point', coordinates: [lng, lat] });

describe('S31 itinerary request', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T17:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it.each([1, 2, 3, 4, 5])('accepts %i days without requiring a stay', (days) => {
    expect(ItineraryRequest.parse({ ...request, days })).toEqual({ ...request, days });
  });

  it.each([0, 6, -1, 1.5, '2', null, Infinity, NaN])('rejects invalid day count %s', (days) => {
    expect(ItineraryRequest.safeParse({ ...request, days }).success).toBe(false);
  });

  it.each(['days', 'startDate', 'transport', 'with', 'tags', 'pace'])('requires %s', (field) => {
    const input: Record<string, unknown> = { ...request };
    delete input[field];
    expect(ItineraryRequest.safeParse(input).success).toBe(false);
  });

  it.each(['motorbike', 'car', 'taxi'])('accepts transport %s', (transport) => {
    expect(ItineraryRequest.parse({ ...request, transport }).transport).toBe(transport);
  });
  it.each(['solo', 'couple', 'friends', 'family'])('accepts companion %s', (companion) => {
    expect(ItineraryRequest.parse({ ...request, with: companion }).with).toBe(companion);
  });
  it.each(['relaxed', 'packed'])('accepts pace %s', (pace) => {
    expect(ItineraryRequest.parse({ ...request, pace }).pace).toBe(pace);
  });
  it.each([
    { transport: 'walk' }, { with: 'group' }, { pace: 'fast' },
    { tags: ['chill'] }, { tags: null }, { tags: 'chill_cafe' },
    { tags: ['chill_cafe', 'clouds_hills', 'photo_spots', 'nature_adventure'] },
    { tags: ['chill_cafe', 'chill_cafe'] },
  ])('rejects invalid preference %j', (override) => {
    expect(ItineraryRequest.safeParse({ ...request, ...override }).success).toBe(false);
  });

  it.each([
    { tags: [] }, { tags: ['chill_cafe'] }, { tags: ['clouds_hills', 'photo_spots'] },
    { tags: ['nature_adventure', 'breakfast_specialties', 'chill_cafe'] },
  ])('accepts up to three distinct interests %j', ({ tags }) => {
    expect(ItineraryRequest.parse({ ...request, tags }).tags).toEqual(tags);
  });

  it('reports duplicate interests at the tags field', () => {
    const result = ItineraryRequest.safeParse({ ...request, tags: ['photo_spots', 'photo_spots'] });
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['tags'] }));
  });

  it.each(['2026-10-19', '2026-10-20', '2028-02-29'])('accepts today and future calendar date %s', (startDate) => {
    expect(ItineraryRequest.parse({ ...request, startDate }).startDate).toBe(startDate);
  });
  it.each(['2026-10-18', '2026-02-29', '2028-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-10-00', '2026-1-19', '', '2026-10-19T00:00:00Z', null])('rejects past or malformed date %s', (startDate) => {
    expect(ItineraryRequest.safeParse({ ...request, startDate }).success).toBe(false);
  });

  it('changes today at Vietnam midnight when reusing the same city schema', () => {
    const schema = createItineraryRequestSchema(bounds);
    vi.setSystemTime(new Date('2026-10-19T16:59:59.999Z'));
    expect(schema.safeParse(request).success).toBe(true);
    vi.setSystemTime(new Date('2026-10-19T17:00:00Z'));
    expect(schema.safeParse(request).success).toBe(false);
    expect(schema.safeParse({ ...request, startDate: '2026-10-20' }).success).toBe(true);
  });

  it('handles Vietnam New Year while UTC is still in the previous year', () => {
    vi.setSystemTime(new Date('2026-12-31T17:00:00Z'));
    expect(ItineraryRequest.safeParse({ ...request, startDate: '2026-12-31' }).success).toBe(false);
    expect(ItineraryRequest.safeParse({ ...request, startDate: '2027-01-01' }).success).toBe(true);
  });

  it.each([[10.5, 20.5], [10, 20.5], [11, 20.5], [10.5, 20], [10.5, 21], [10, 20], [11, 21]])('accepts a stay inside or on the city bounds at %j', (lng, lat) => {
    const stayLocation = point(lng, lat);
    expect(createItineraryRequestSchema(bounds).parse({ ...request, stayLocation }).stayLocation).toEqual(stayLocation);
  });

  it('allows omitting the stay with a city-bound schema', () => {
    expect(createItineraryRequestSchema(bounds).parse(request)).toEqual(request);
  });

  it.each([[9.999, 20.5], [11.001, 20.5], [10.5, 19.999], [10.5, 21.001], [20.5, 10.5]])('rejects a stay outside the city bounds at %j', (lng, lat) => {
    const result = createItineraryRequestSchema(bounds).safeParse({ ...request, stayLocation: point(lng, lat) });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['stayLocation', 'coordinates'] }));
  });

  it.each([null, [10.5, 20.5], {}, { type: 'LineString', coordinates: [10.5, 20.5] }, point(181, 0), point(0, 91), point(NaN, 0), { type: 'Point', coordinates: [10, 20, 30] }])('rejects malformed GeoJSON stay %j', (stayLocation) => {
    expect(createItineraryRequestSchema(bounds).safeParse({ ...request, stayLocation }).success).toBe(false);
  });

  it.each([[11, 20, 10, 21], [10, 21, 11, 20], [10, 20, 10, 21], [-181, 20, 11, 21]])('rejects invalid city bounds %j', (west, south, east, north) => {
    expect(() => createItineraryRequestSchema([west, south, east, north])).toThrow();
  });
});
