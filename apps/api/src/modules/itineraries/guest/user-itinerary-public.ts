import { ItineraryUserDetail, publicItineraryParams, type CityRef, type ItineraryStopPlace } from '@ranhduong/contracts';
import type { UserItineraryRow } from '../itineraries.repository';
import { tripCalendar } from '../planner/calendar';

/** Reused by every guest response; reads current public facts and never spreads a stored document. */
export function toUserItinerary(row: UserItineraryRow, city: CityRef, places: ReadonlyMap<string, ItineraryStopPlace>, gid?: string): ItineraryUserDetail | null {
  const params = publicItineraryParams.safeParse(row.params);
  if (!params.success || row.days.length !== params.data.days) return null;
  const calendar = tripCalendar(params.data.startDate, params.data.days);
  const publicPlace = (id: string) => {
    const place = places.get(id);
    return place ? { ...place, id } : null;
  };
  const result = ItineraryUserDetail.safeParse({
    shareId: row.shareId, title: row.title, version: row.version, canEdit: Boolean(gid && gid === row.guestId && !row.ownerId),
    city: { slug: city.slug, name: city.name }, params: params.data,
    days: row.days.map((day, index) => ({
      day: day.day, date: calendar[index]!.date, startTime: day.startTime, zoneIds: day.zoneIds.map(String),
      stops: day.stops.map((stop, i) => ({
        key: stop.key, number: i + 1, start: stop.start, end: stop.end, travelMinFromPrev: stop.travelMinFromPrev,
        note: places.has(stop.placeId.toString()) ? stop.note : '', kind: stop.kind, locked: stop.locked, isVip: stop.isVip,
        place: publicPlace(stop.placeId.toString()),
      })),
      detours: (day.detours ?? []).map((detour) => ({ afterKey: detour.afterKey, place: publicPlace(detour.placeId.toString()), detourMin: detour.detourMin })),
      issues: day.issues ?? [],
    })),
  });
  return result.success ? result.data : null;
}
