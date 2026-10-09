import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { Place, PlaceCard } from './place.js';

/** Editorial fields exposed on the public detail page; excludes ownership, moderation and import data. */
export const PlaceDetail = z.object(Place.shape).pick({
  slug: true, name: true, category: true, alsoCategories: true, tags: true,
  location: true, address: true, openingHours: true, visitDurationMin: true,
  bestTime: true, cover: true, priceLevel: true, transport: true,
  practicalNotes: true, contact: true, photos: true, lastVerifiedAt: true,
}).extend({
  id: ObjectIdString,
  status: z.enum(['active', 'closed']),
  zoneSlug: Slug.optional(),
  zoneName: z.string().optional(),
  googlePlaceId: z.string().min(1).optional(),
  lastVerifiedAt: z.iso.datetime().optional(),
  unconfirmed: z.boolean(),
});
export type PlaceDetail = z.infer<typeof PlaceDetail>;

export const PlaceDetailResponse = z.object({ place: PlaceDetail, nearby: z.array(PlaceCard) });
export type PlaceDetailResponse = z.infer<typeof PlaceDetailResponse>;
