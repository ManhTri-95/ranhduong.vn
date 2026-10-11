import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { PlaceStatus } from './enums.js';

export const PlaceEventType = z.enum(['place_view', 'direction_click', 'call_click', 'fanpage_click']);
export type PlaceEventType = z.infer<typeof PlaceEventType>;
export const PlaceEventSource = z.enum(['direct', 'search', 'list', 'itinerary', 'map']);
export type PlaceEventSource = z.infer<typeof PlaceEventSource>;
export const PlaceEvent = z.strictObject({ type: PlaceEventType, placeId: ObjectIdString, source: PlaceEventSource.optional() });
export type PlaceEvent = z.infer<typeof PlaceEvent>;
export const EventBatch = z.strictObject({ events: z.array(PlaceEvent).min(1).max(20) });
export type EventBatch = z.infer<typeof EventBatch>;
export const EventReceipt = z.object({ accepted: z.number().int().nonnegative() });
export type EventReceipt = z.infer<typeof EventReceipt>;
export const MetricDayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ');
export const MetricCounts = z.object({ views: z.number().int().nonnegative(), directionClicks: z.number().int().nonnegative(), calls: z.number().int().nonnegative(), fanpageClicks: z.number().int().nonnegative() });
export type MetricCounts = z.infer<typeof MetricCounts>;
export const METRIC_FIELDS = ['views', 'directionClicks', 'calls', 'fanpageClicks'] as const;
export const EVENT_METRIC_FIELD: Record<PlaceEventType, keyof MetricCounts> = { place_view: 'views', direction_click: 'directionClicks', call_click: 'calls', fanpage_click: 'fanpageClicks' };
export const emptyMetricCounts = (): MetricCounts => ({ views: 0, directionClicks: 0, calls: 0, fanpageClicks: 0 });
export const MetricPlaceRef = z.object({ id: ObjectIdString, cityId: ObjectIdString, slug: Slug, name: z.string(), status: PlaceStatus });
export type MetricPlaceRef = z.infer<typeof MetricPlaceRef>;
export const MetricDaily = z.object({ placeId: ObjectIdString, cityId: ObjectIdString, dayKey: MetricDayKey, counts: MetricCounts });
export type MetricDaily = z.infer<typeof MetricDaily>;
export const WeeklyMetricsQuery = z.object({ week: MetricDayKey.optional() });
export type WeeklyMetricsQuery = z.infer<typeof WeeklyMetricsQuery>;
export const WeeklyMetricsReport = z.object({
  weekStart: MetricDayKey, weekEnd: MetricDayKey, updatedAt: z.iso.datetime(), totals: MetricCounts,
  days: z.array(z.object({ dayKey: MetricDayKey, counts: MetricCounts })).length(7),
  items: z.array(z.object({ placeId: ObjectIdString, slug: Slug, name: z.string(), status: PlaceStatus, counts: MetricCounts })),
});
export type WeeklyMetricsReport = z.infer<typeof WeeklyMetricsReport>;
export function metricsDayKey(now: Date): string { return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10); }
export function shiftMetricDay(day: string, offset: number): string { return new Date(new Date(`${day}T00:00:00Z`).getTime() + offset * 86400000).toISOString().slice(0, 10); }
export function metricsWeekStart(day: string): string { return shiftMetricDay(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7)); }
