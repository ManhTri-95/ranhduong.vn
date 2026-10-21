import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { TemplateTime } from './itinerary-admin.js';
import { ItineraryPublicStop, ItineraryStopPlace } from './itinerary-public.js';
import { ItineraryPace, ItineraryTransport, TripDays } from './itinerary.js';
import { TripInterest, TripWith } from './trip.js';

/** 20 random base62 characters (~119 bits); never accept a MongoDB ObjectId on public routes. */
export const ItineraryShareId = z.string().regex(/^[A-Za-z0-9]{20}$/);
export type ItineraryShareId = z.infer<typeof ItineraryShareId>;

/** Safe source for a future copy: deliberately excludes accommodation and ownership. Past trips remain readable. */
export const publicItineraryParams = z.object({
  days: TripDays, startDate: z.iso.date(), transport: ItineraryTransport, with: TripWith,
  tags: z.array(TripInterest).max(3), pace: ItineraryPace,
});

export const ItineraryDayIssue = z.enum(['missing_lunch', 'missing_dinner']);

/** One allowlisted response for create/read and future edit, optimize and copy operations. */
export const ItineraryUserDetail = z.object({
  shareId: ItineraryShareId, title: z.string().min(1), version: z.number().int().min(1), canEdit: z.boolean(),
  city: z.object({ slug: Slug, name: z.string().min(1) }),
  params: publicItineraryParams,
  days: z.array(z.object({
    day: TripDays, date: z.iso.date(), startTime: TemplateTime, zoneIds: z.array(ObjectIdString),
    stops: z.array(ItineraryPublicStop.extend({ key: z.uuid(), locked: z.boolean(), isVip: z.boolean() })).max(20),
    detours: z.array(z.object({ afterKey: z.uuid(), place: ItineraryStopPlace.nullable(), detourMin: z.number().int().nonnegative() })),
    issues: z.array(ItineraryDayIssue),
  })).min(1).max(5),
});
export type ItineraryUserDetail = z.infer<typeof ItineraryUserDetail>;
