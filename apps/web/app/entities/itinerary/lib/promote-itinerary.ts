import type { ItineraryCard } from '@ranhduong/contracts';
export function promoteItinerary(items: ItineraryCard[], featured: ItineraryCard | null): ItineraryCard[] {
  return featured ? [featured, ...items.filter((item) => item.slug !== featured.slug)] : [...items];
}
