import { describe, expect, it } from 'vitest';
import { TripInterest, TripWith, TRIP_INTEREST_TAGS, TRIP_INTEREST_BEST_TIMES, TRIP_WITH_TAGS } from './trip.js';

describe('S31 trip preferences', () => {
  it.each(['solo', 'couple', 'friends', 'family'])('accepts companion %s', (value) => {
    expect(TripWith.parse(value)).toBe(value);
  });

  it.each(['', 'group', 'gia-dinh', null])('rejects unknown companion %s', (value) => {
    expect(TripWith.safeParse(value).success).toBe(false);
  });

  it.each([
    ['chill_cafe', ['chill'], []],
    ['clouds_hills', ['view-doi'], ['sunrise']],
    ['photo_spots', ['song-ao'], []],
    ['nature_adventure', ['mao-hiem'], []],
    ['breakfast_specialties', ['an-sang', 'dac-san'], []],
  ] as const)('maps interest %s to existing place tags and best times', (value, tags, bestTimes) => {
    const interest = TripInterest.parse(value);
    expect(TRIP_INTEREST_TAGS[interest]).toEqual(tags);
    expect(TRIP_INTEREST_BEST_TIMES[interest]).toEqual(bestTimes);
  });

  it.each(['', 'chill', 'sunrise', null])('rejects place tags as interest %s', (value) => {
    expect(TripInterest.safeParse(value).success).toBe(false);
  });

  it('adds family preference without giving the other companions place tags', () => {
    expect(TRIP_WITH_TAGS.family).toEqual(['gia-dinh']);
    for (const companion of ['solo', 'couple', 'friends'] as const) {
      expect(TRIP_WITH_TAGS[companion]).toEqual([]);
    }
  });
});
