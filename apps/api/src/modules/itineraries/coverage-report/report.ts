import { setImmediate } from 'node:timers/promises';
import {
  ItineraryCoverageReport, ItineraryPace, metricsDayKey, openingHoursIssues, PlaceCategory, servesCategory,
  shiftMetricDay, TripDays, TripInterest, verificationStale,
  type ItineraryCoverageFailure, type ItineraryCoverageQuery, type ItineraryCoverageReason, type ItineraryCoverageZone,
  type ItineraryPlace, type ItineraryZone,
} from '@ranhduong/contracts';
import { generateItinerary } from '../planner/generate-itinerary';
import type { PlanInput } from '../planner/plan-context';

export function countCoveragePlaces(places: readonly ItineraryPlace[], zones: readonly ItineraryZone[], now: Date): ItineraryCoverageZone[] {
  return zones.map((zone) => {
    const ready = places.filter((p) => p.zoneId === zone.id && p.status === 'active' && !verificationStale(p.lastVerifiedAt, now)
      && p.location !== undefined && p.visitDurationMin !== undefined && openingHoursIssues(p.openingHours).length === 0);
    return {
      id: zone.id, slug: zone.slug, name: zone.name, total: ready.length,
      categories: {
        cafe: 0, food: 0, attraction: 0, activity: 0, shop: 0, stay: 0,
        ...Object.fromEntries(PlaceCategory.options.map((category) => [category, ready.filter((p) => servesCategory(p, category)).length])),
      },
    };
  });
}

/** Runs the production generator without saving any itinerary. Yield between cases so other requests can run. */
export async function buildCoverageReport(input: Omit<PlanInput, 'request'>, query: ItineraryCoverageQuery): Promise<ItineraryCoverageReport> {
  const startDate = query.startDate ?? metricsDayKey(input.now);
  const zoneSlugs = new Map(input.zones.map((zone) => [zone.id, zone.slug]));
  const failures: ItineraryCoverageFailure[] = [];
  let total = 0;
  for (const days of TripDays.values) {
    for (const pace of ItineraryPace.options) {
      for (let offset = 0; offset < 7; offset++) {
        const date = shiftMetricDay(startDate, offset);
        const startWeekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        for (const interest of [null, ...TripInterest.options]) {
          const result = generateItinerary({ ...input, request: { days, pace, startDate: date, transport: query.transport, with: query.with, tags: interest ? [interest] : [] } });
          const reasons: ItineraryCoverageReason[] = result.ok
            ? result.days.flatMap((day) => day.issues.map((code) => ({ code, day: day.day as TripDays, zoneSlugs: day.zoneIds.flatMap((id) => zoneSlugs.get(id) ?? []) })))
            : result.details.shortages.map((s) => ({ code: 'not_enough_places', ...s, day: s.day as TripDays }));
          if (reasons.length) failures.push({ days, pace, startDate: date, startWeekday, interest, reasons });
          total++;
          await setImmediate();
        }
      }
    }
  }
  return ItineraryCoverageReport.parse({
    checkedAt: input.now.toISOString(), startDate, endDate: shiftMetricDay(startDate, 6), transport: query.transport, with: query.with,
    total, passed: total - failures.length, failed: failures.length, zones: countCoveragePlaces(input.places, input.zones, input.now), failures,
  });
}
