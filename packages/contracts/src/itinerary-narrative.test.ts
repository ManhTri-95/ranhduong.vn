import { describe, expect, it } from 'vitest';
import { ItineraryNarrative } from './itinerary-narrative.js';

const key = '11111111-1111-4111-8111-111111111111';
const otherKey = '22222222-2222-4222-8222-222222222222';
const stop = { key, note: 'Ghé Điểm Giả Lập rồi thong thả đi tiếp.' };
const day = { day: 1, intro: 'Một ngày quanh cụm Giả Lập.', stops: [stop] };
const narrative = { intro: 'Mình đi một vòng nhé.', days: [day] };

describe('S31 structured itinerary narrative', () => {
  it('parses structured Vietnamese descriptions with UUID stop keys', () => {
    expect(ItineraryNarrative.parse(narrative)).toEqual(narrative);
  });

  it('trims prose and keeps notes attached to their stop keys', () => {
    expect(ItineraryNarrative.parse({
      intro: ` ${narrative.intro} `,
      days: [{ ...day, intro: ` ${day.intro} `, stops: [{ key, note: ` ${stop.note} ` }] }],
    })).toEqual(narrative);
  });

  it('accepts five days with twenty distinct stops per day', () => {
    const days = Array.from({ length: 5 }, (_, d) => ({
      ...day, day: d + 1,
      stops: Array.from({ length: 20 }, (_, s) => ({ ...stop, key: `${String(d * 20 + s + 1).padStart(8, '0')}-1111-4111-8111-111111111111` })),
    }));
    expect(ItineraryNarrative.parse({ ...narrative, days }).days).toHaveLength(5);
  });

  it.each([
    {}, { ...narrative, intro: undefined }, { ...narrative, intro: null },
    { ...narrative, days: undefined }, { ...narrative, days: [] },
    { ...narrative, days: Array.from({ length: 6 }, (_, i) => ({ ...day, day: i + 1 })) },
    { ...narrative, days: [{ ...day, stops: [] }] },
    { ...narrative, days: [{ ...day, stops: Array.from({ length: 21 }, () => stop) }] },
    { ...narrative, days: [{ ...day, intro: undefined }] },
    { ...narrative, days: [{ ...day, stops: [{ key }] }] },
    { ...narrative, days: [{ ...day, stops: [{ note: stop.note }] }] },
  ])('rejects incomplete or oversized narrative structure %j', (input) => {
    expect(ItineraryNarrative.safeParse(input).success).toBe(false);
  });

  it.each(['', '   ', 'a'.repeat(4001), 123, null])('rejects invalid introduction %#', (intro) => {
    expect(ItineraryNarrative.safeParse({ ...narrative, intro }).success).toBe(false);
    expect(ItineraryNarrative.safeParse({ ...narrative, days: [{ ...day, intro }] }).success).toBe(false);
  });

  it.each(['', '   ', 'a'.repeat(2001), 123, null])('rejects invalid note %#', (note) => {
    expect(ItineraryNarrative.safeParse({ ...narrative, days: [{ ...day, stops: [{ key, note }] }] }).success).toBe(false);
  });

  it('accepts prose at the maximum length', () => {
    const result = ItineraryNarrative.parse({ intro: 'a'.repeat(4000), days: [{ ...day, intro: 'b'.repeat(4000), stops: [{ key, note: 'c'.repeat(2000) }] }] });
    expect(result.days[0]?.stops[0]?.note).toHaveLength(2000);
  });

  it.each([0, 6, 1.5, '1', null])('rejects invalid day number %s', (number) => {
    expect(ItineraryNarrative.safeParse({ ...narrative, days: [{ ...day, day: number }] }).success).toBe(false);
  });

  it.each(['', 'place-id', '111111111111111111111111', null])('rejects non-UUID stop key %s', (invalidKey) => {
    expect(ItineraryNarrative.safeParse({ ...narrative, days: [{ ...day, stops: [{ ...stop, key: invalidKey }] }] }).success).toBe(false);
  });

  it('rejects duplicate day numbers even when keys differ', () => {
    const result = ItineraryNarrative.safeParse({ ...narrative, days: [day, { ...day, stops: [{ ...stop, key: otherKey }] }] });
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['days', 1, 'day'] }));
  });

  it('rejects duplicate stop keys within a day', () => {
    const result = ItineraryNarrative.safeParse({ ...narrative, days: [{ ...day, stops: [stop, stop] }] });
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['days', 0, 'stops', 1, 'key'] }));
  });

  it('rejects duplicate stop keys across days', () => {
    const result = ItineraryNarrative.safeParse({ ...narrative, days: [day, { ...day, day: 2 }] });
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['days', 1, 'stops', 0, 'key'] }));
  });

  it.each([
    { ...narrative, placeId: 'unexpected' },
    { ...narrative, days: [{ ...day, address: 'unexpected' }] },
    { ...narrative, days: [{ ...day, stops: [{ ...stop, price: 123 }] }] },
  ])('rejects extra narrative fields %j', (input) => {
    expect(ItineraryNarrative.safeParse(input).success).toBe(false);
  });
});
