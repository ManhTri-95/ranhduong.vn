import { z } from 'zod';
import type { BestTime } from './enums.js';

export const TripWith = z.enum(['solo', 'couple', 'friends', 'family']);
export type TripWith = z.infer<typeof TripWith>;

export const TripInterest = z.enum(['chill_cafe', 'clouds_hills', 'photo_spots', 'nature_adventure', 'breakfast_specialties']);
export type TripInterest = z.infer<typeof TripInterest>;

/** Gu chỉ cộng điểm; không dùng các bảng này để loại địa điểm (technical-design §7). */
export const TRIP_INTEREST_TAGS: Readonly<Record<TripInterest, readonly string[]>> = {
  chill_cafe: ['chill'],
  clouds_hills: ['view-doi'],
  photo_spots: ['song-ao'],
  nature_adventure: ['mao-hiem'],
  breakfast_specialties: ['an-sang', 'dac-san'],
};

export const TRIP_INTEREST_BEST_TIMES: Readonly<Record<TripInterest, readonly BestTime[]>> = {
  chill_cafe: [],
  clouds_hills: ['sunrise'],
  photo_spots: [],
  nature_adventure: [],
  breakfast_specialties: [],
};

export const TRIP_WITH_TAGS: Readonly<Record<TripWith, readonly string[]>> = {
  solo: [], couple: [], friends: [], family: ['gia-dinh'],
};
