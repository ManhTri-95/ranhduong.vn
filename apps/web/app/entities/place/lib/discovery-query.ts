import { PUBLIC_CATEGORIES, type PublicCategory } from '@ranhduong/contracts';
import { parseListingQuery } from './listing-query';
import { parseMapFilters } from './map-query';

export interface DiscoveryFilter { q?: string; category?: PublicCategory; zone?: string; tags: string[]; rainSafe: boolean; cursor?: string }
export type DiscoveryQuery = Record<string, string | null | (string | null)[] | undefined>;

/** One normalization path for editorial lists and their GET/router forms. */
export function parseDiscoveryQuery(query: DiscoveryQuery): DiscoveryFilter {
  const listing = parseListingQuery(query);
  const map = parseMapFilters(query);
  return { tags: listing.tags, q: map.q, category: PUBLIC_CATEGORIES.find(category => category === map.category), zone: map.zone, rainSafe: map.rainSafe, cursor: map.q ? undefined : listing.cursor };
}

export function discoveryHref(path: string, filter: DiscoveryFilter): string {
  const query = new URLSearchParams();
  if (filter.q) query.set('q', filter.q);
  if (filter.tags.length) query.set('tags', filter.tags.join(','));
  if (filter.category) query.set('category', filter.category);
  if (filter.zone) query.set('zone', filter.zone);
  if (filter.rainSafe) query.set('rainSafe', 'true');
  if (filter.cursor && !filter.q) query.set('cursor', filter.cursor);
  return query.size ? `${path}?${query}` : path;
}

export function discoveryIndexable(filter: DiscoveryFilter): boolean {
  return !filter.q && !filter.category && !filter.zone && !filter.rainSafe && !filter.tags.length && !filter.cursor;
}
