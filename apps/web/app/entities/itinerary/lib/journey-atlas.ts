import type { ItineraryPublicStop } from '@ranhduong/contracts';
import type { ItineraryDay } from './itinerary-summary';

/** Presentation only: retain public slots, stable keys and backend order. */
export function atlasDays(days: readonly ItineraryDay[]): ItineraryDay[] {
  return days.map(day => ({ ...day, stops: day.stops.map((stop, index) => ({ ...stop, number: index + 1 })) }));
}

export interface AtlasSelection { day: number; key: string | null }

/** A stop belongs to one explicit chapter; scroll position is never selection. */
export function atlasSelection(days: readonly ItineraryDay[], day: number, key: string | null): AtlasSelection {
  const chapter = days.find(item => item.day === day) ?? days[0];
  return { day: chapter?.day ?? 1, key: chapter?.stops.find(stop => stop.key === key)?.key ?? chapter?.stops[0]?.key ?? null };
}

export function atlasCover(days: readonly ItineraryDay[]): ItineraryPublicStop | null {
  for (const day of days) {
    const stop = day.stops.find(item => item.place?.coverKey);
    if (stop) return stop;
  }
  return null;
}
