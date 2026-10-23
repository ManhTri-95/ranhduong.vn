import type { ItineraryPublicStop, ItineraryTemplateDetail } from '@ranhduong/contracts';
export function journalPreview(detail: ItineraryTemplateDetail): { day: number; stop: ItineraryPublicStop }[] {
  return detail.days.flatMap(day => day.stops.flatMap(stop => stop.place ? [{ day: day.day, stop }] : [])).slice(0, 3);
}
