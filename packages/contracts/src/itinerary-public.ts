import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { TemplateEndTime, TemplateTime } from './itinerary-admin.js';
import { ItineraryPace, ItineraryTransport, StopKind } from './itinerary.js';
import { PlaceDetail } from './place-detail.js';

/** Current public facts for a template stop; excludes moderation and authoring data. */
export const ItineraryStopPlace = PlaceDetail.pick({
  slug: true, name: true, category: true, alsoCategories: true, location: true,
  address: true, practicalNotes: true, googlePlaceId: true, zoneName: true, unconfirmed: true,
}).extend({ id: ObjectIdString.optional(), coverKey: z.string().min(1).optional() });
export type ItineraryStopPlace = z.infer<typeof ItineraryStopPlace>;

/** Null place preserves the slot when its referenced place is no longer public. */
export const ItineraryPublicStop = z.object({
  key: z.string().min(1), number: z.number().int().min(1).max(20),
  start: TemplateTime, end: TemplateEndTime, travelMinFromPrev: z.number().int().nonnegative(),
  note: z.string(), kind: StopKind, place: ItineraryStopPlace.nullable(),
});
export type ItineraryPublicStop = z.infer<typeof ItineraryPublicStop>;

export const ItineraryTemplateDetail = z.object({
  slug: Slug, title: z.string().min(1), description: z.string(), season: z.string(), style: z.string(),
  seoTitle: z.string(), seoDescription: z.string(), transport: ItineraryTransport, pace: ItineraryPace,
  days: z.array(z.object({ day: z.number().int().min(1).max(5), stops: z.array(ItineraryPublicStop).max(20) })).min(1).max(5),
});
export type ItineraryTemplateDetail = z.infer<typeof ItineraryTemplateDetail>;
