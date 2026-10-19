import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { GeoPoint } from './geojson.js';
import { PlaceCategory, PlaceStatus } from './enums.js';
import { OpeningSlot } from './opening-hours.js';
import { ItineraryPace, ItineraryStatus, ItineraryTransport, StopKind } from './itinerary.js';
import { TripInterest, TripWith } from './trip.js';

export const TemplateTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải từ 00:00 đến 23:59');
export const TemplateEndTime = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Giờ đi phải từ 00:00 đến 24:00');
export const TemplateStopInput = z.object({
  key: z.uuid(), placeId: ObjectIdString, kind: StopKind, note: z.string().max(2000),
  durationMin: z.number().int('Thời gian dừng phải là số phút nguyên').min(1, 'Thời gian dừng ít nhất 1 phút').max(1440, 'Thời gian dừng tối đa 1440 phút').optional(),
  manualStart: TemplateTime.optional(), manualEnd: TemplateEndTime.optional(),
});
export type TemplateStopInput = z.infer<typeof TemplateStopInput>;
export const TemplateDragPayload = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('place'), placeId: ObjectIdString }),
  z.object({ kind: z.literal('stop'), key: z.uuid() }),
]);
export const TemplateDayInput = z.object({ startTime: TemplateTime, stops: z.array(TemplateStopInput).max(20, 'Tối đa 20 điểm mỗi ngày') });
export type TemplateDayInput = z.infer<typeof TemplateDayInput>;
export const TemplateLocalDraft = z.object({
  title: z.string(), description: z.string().max(4000), season: z.string().max(100), style: z.string().max(100),
  tags: z.array(TripInterest).max(3, 'Chọn tối đa 3 gu')
    .refine((tags) => new Set(tags).size === tags.length, 'Không chọn gu trùng nhau').default([]),
  with: TripWith.optional(),
  transport: ItineraryTransport, pace: ItineraryPace, startWeekday: z.number().int().min(0).max(6),
  seoTitle: z.string().max(200), seoDescription: z.string().max(500),
  // Keep unfinished time text during local recovery; only API input accepts validated times.
  status: ItineraryStatus.default('draft'), days: z.array(TemplateDayInput.extend({ startTime: z.string(), stops: z.array(TemplateStopInput.extend({ manualStart: z.string().optional(), manualEnd: z.string().optional(), durationMin: z.number().optional() })).max(20) })).min(1).max(5),
});
export const TemplateEditInput = TemplateLocalDraft.extend({
  days: z.array(TemplateDayInput).min(1).max(5),
  title: z.string().trim().min(1, 'Nhập tên lịch trình').max(200), description: z.string().trim().max(4000),
  season: z.string().trim().max(100), style: z.string().trim().max(100), seoTitle: z.string().trim().max(200), seoDescription: z.string().trim().max(500),
}).superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.days.forEach((day, d) => day.stops.forEach((stop, s) => {
    if (seen.has(stop.key)) ctx.addIssue({ code: 'custom', path: ['days', d, 'stops', s, 'key'], message: 'Mã điểm dừng bị lặp' });
    seen.add(stop.key);
  }));
});
export type TemplateEditInput = z.infer<typeof TemplateEditInput>;

/** City-scoped scheduling facts, read only through PlacesService. */
export const TemplatePlace = z.object({
  id: ObjectIdString, name: z.string(), slug: Slug, category: PlaceCategory, alsoCategories: z.array(PlaceCategory), status: PlaceStatus,
  zoneId: ObjectIdString.optional(), zoneName: z.string().optional(), location: GeoPoint.optional(), openingHours: z.array(OpeningSlot),
  visitDurationMin: z.number().int().positive().optional(), lastVerifiedAt: z.iso.datetime().optional(), validPhoto: z.boolean(), coverKey: z.string().optional(),
});
export type TemplatePlace = z.infer<typeof TemplatePlace>;
export const TemplatePlaceResponse = z.object({ items: z.array(TemplatePlace) });
export type TemplatePlaceResponse = z.infer<typeof TemplatePlaceResponse>;
export const TemplateIssue = z.object({
  code: z.enum(['empty_day', 'missing_place', 'unavailable', 'location_missing', 'invalid_time', 'overlap', 'outside_hours', 'draft_place', 'stale_verification', 'missing_photo', 'missing_lunch', 'missing_dinner', 'late_finish']),
  level: z.enum(['error', 'warning']), day: z.number().int().nonnegative(), stopKey: z.uuid().optional(), message: z.string(),
});
export type TemplateIssue = z.infer<typeof TemplateIssue>;
export const ScheduledTemplateStop = TemplateStopInput.extend({ start: z.string(), end: z.string(), travelMinFromPrev: z.number().nonnegative() });
export type ScheduledTemplateStop = z.infer<typeof ScheduledTemplateStop>;
export const TemplateAnalysis = z.object({
  days: z.array(z.object({ day: z.number().int(), weekday: z.number().int(), startTime: TemplateTime, stops: z.array(ScheduledTemplateStop) })),
  issues: z.array(TemplateIssue), canPublish: z.boolean(),
});
export type TemplateAnalysis = z.infer<typeof TemplateAnalysis>;
export const AdminTemplate = TemplateEditInput.safeExtend({ id: ObjectIdString, cityId: ObjectIdString, slug: Slug, analysis: TemplateAnalysis });
export type AdminTemplate = z.infer<typeof AdminTemplate>;
export const AdminTemplateResponse = z.object({ items: z.array(AdminTemplate) });
export type AdminTemplateResponse = z.infer<typeof AdminTemplateResponse>;
