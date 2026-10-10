import type { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { absoluteUrl, itemListJsonLd, type JsonLd } from '~/shared/lib/seo';

export function tripJsonLd(trip: ItineraryTemplateDetail, siteUrl: string, citySlug: string): JsonLd {
  const places = trip.days.flatMap((day) => day.stops.flatMap((stop) => stop.place ? [stop.place] : []));
  return { '@context': 'https://schema.org', '@type': 'TouristTrip', name: trip.title, description: trip.description, url: absoluteUrl(siteUrl, `/${citySlug}/lich-trinh/${trip.slug}`), itinerary: itemListJsonLd(siteUrl, citySlug, places) };
}
