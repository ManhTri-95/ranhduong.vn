import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { ItineraryPace, ItineraryTransport, TripDays } from './itinerary.js';
import { ItineraryRequest } from './itinerary-request.js';
import { TripInterest, TripWith } from './trip.js';

/** Seven departure dates from startDate; absent means today in Vietnam, resolved at request time. */
export const ItineraryCoverageQuery = z.object({
  startDate: ItineraryRequest.shape.startDate.optional(),
  transport: ItineraryTransport.default('motorbike'),
  with: TripWith.default('friends'),
});
export type ItineraryCoverageQuery = z.infer<typeof ItineraryCoverageQuery>;

const count = z.number().int().nonnegative();
export const ItineraryCoverageZone = z.object({
  id: ObjectIdString, slug: Slug, name: z.string(), total: count,
  /** A place can serve several categories; total counts each place once. */
  categories: z.object({ cafe: count, food: count, attraction: count, activity: count, shop: count, stay: count }),
});
export type ItineraryCoverageZone = z.infer<typeof ItineraryCoverageZone>;

export const ItineraryCoverageReason = z.discriminatedUnion('code', [
  z.object({ code: z.literal('not_enough_places'), day: TripDays, zoneSlugs: z.array(Slug), available: count }),
  z.object({ code: z.literal(['missing_lunch', 'missing_dinner']), day: TripDays, zoneSlugs: z.array(Slug) }),
]);
export type ItineraryCoverageReason = z.infer<typeof ItineraryCoverageReason>;

export const ItineraryCoverageFailure = z.object({
  days: TripDays, pace: ItineraryPace, startDate: z.iso.date(), startWeekday: z.number().int().min(0).max(6),
  /** null is the default, empty interest selection. */
  interest: TripInterest.nullable(), reasons: z.array(ItineraryCoverageReason).min(1),
});
export type ItineraryCoverageFailure = z.infer<typeof ItineraryCoverageFailure>;

export const ItineraryCoverageReport = z.object({
  checkedAt: z.iso.datetime(), startDate: z.iso.date(), endDate: z.iso.date(),
  transport: ItineraryTransport, with: TripWith,
  total: count, passed: count, failed: count,
  zones: z.array(ItineraryCoverageZone), failures: z.array(ItineraryCoverageFailure),
});
export type ItineraryCoverageReport = z.infer<typeof ItineraryCoverageReport>;
