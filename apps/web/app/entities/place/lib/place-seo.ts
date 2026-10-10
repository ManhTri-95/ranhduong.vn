import type { OpeningSlot, PlaceCategory, PlaceDetail } from '@ranhduong/contracts';
import type { JsonLd } from '~/shared/lib/seo';

const TYPES: Record<PlaceCategory, string> = { attraction: 'TouristAttraction', cafe: 'CafeOrCoffeeShop', food: 'Restaurant', activity: 'TouristAttraction', stay: 'LodgingBusiness', shop: 'Store' };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function schemaHours(slots: OpeningSlot[]): JsonLd[] {
  const hours = (day: number, opens: string, closes: string): JsonLd => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAYS[day]}`, opens, closes });
  return slots.flatMap((slot) => {
    // Google uses 00:00–23:59 for all-day opening; 00:00–00:00 would mean closed.
    if (slot.open === '00:00' && (slot.close === '00:00' || slot.close === '24:00')) return [hours(slot.day, '00:00', '23:59')];
    // Legacy equal endpoints represent a 24-hour interval starting at the given time.
    if (slot.open === slot.close) return [hours(slot.day, slot.open, '00:00'), hours((slot.day + 1) % 7, '00:00', slot.close)];
    return [hours(slot.day, slot.open, slot.close === '24:00' ? '00:00' : slot.close)];
  });
}

export function placeJsonLd(place: PlaceDetail, url: string, images: string[] = []): JsonLd {
  const types = [...new Set([place.category, ...(place.alsoCategories ?? [])].map((category) => TYPES[category]))];
  return {
    '@context': 'https://schema.org', '@type': types.length === 1 ? types[0] : types, '@id': `${url}#place`, name: place.name, url,
    ...(place.address ? { address: { '@type': 'PostalAddress', streetAddress: place.address, addressCountry: 'VN' } } : {}),
    ...(place.location ? { geo: { '@type': 'GeoCoordinates', longitude: place.location.coordinates[0], latitude: place.location.coordinates[1] } } : {}),
    ...(place.status === 'active' && place.openingHours.length ? { openingHoursSpecification: schemaHours(place.openingHours) } : {}),
    ...(place.contact?.phone ? { telephone: place.contact.phone } : {}),
    ...(images.length ? { image: images } : {}),
    ...(place.ratingAvg !== undefined && place.ratingCount >= 3 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: place.ratingAvg, ratingCount: place.ratingCount, bestRating: 5, worstRating: 1 } } : {}),
  };
}
