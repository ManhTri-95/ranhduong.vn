import { PUBLIC_CATEGORIES, tagLabel, type TagCount } from '@ranhduong/contracts';
import type { PlaceListParams } from '../api/places';
import { LISTING_PAGE_SIZE } from './listing-query';
import { mapFilterQuery } from './map-query';
import { discoveryHref, discoveryIndexable, parseDiscoveryQuery, type DiscoveryFilter, type DiscoveryQuery } from './discovery-query';

export type AreaFilter = Omit<DiscoveryFilter, 'zone'>;

/** Adapt supported public filters only; keyword results have no cursor in the existing API. */
export function parseAreaQuery(query: DiscoveryQuery): AreaFilter {
  const filter = parseDiscoveryQuery(query);
  return { tags: filter.tags, q: filter.q, category: filter.category, rainSafe: filter.rainSafe, cursor: filter.cursor };
}

export function areaApiParams(zone: string, filter: AreaFilter): PlaceListParams {
  return { zone, category: filter.category ?? PUBLIC_CATEGORIES.join(','), q: filter.q, tags: filter.tags.length ? filter.tags.join(',') : undefined, rainSafe: filter.rainSafe ? 'true' : undefined, cursor: filter.q ? undefined : filter.cursor, limit: LISTING_PAGE_SIZE };
}

export function areaHref(path: string, filter: AreaFilter): string {
  return discoveryHref(path, filter);
}

export function areaMapHref(city: string, zone: string, filter: AreaFilter): string {
  return `/${city}/ban-do?${new URLSearchParams(mapFilterQuery(filter.category, filter.rainSafe, { q: filter.q, zone, tags: filter.tags }))}`;
}

export function areaIndexable(filter: AreaFilter): boolean {
  return discoveryIndexable(filter);
}

const MOMENTS: Readonly<Record<string, string>> = {
  'an-sang': 'Bắt đầu bằng một bữa sáng.',
  chill: 'Ngồi lại. Thong thả một chút.',
  'gia-dinh': 'Một vòng cùng gia đình.',
  'song-ao': 'Tìm một góc để nhớ.',
  'view-doi': 'Đưa mắt về phía đồi.',
  'dac-san': 'Đi theo hương vị địa phương.',
};

/** Tag metadata proves membership counts, not a place's best time or photograph suitability. */
export function areaMoments(tags: readonly TagCount[]) {
  return tags.flatMap(tag => Object.hasOwn(MOMENTS, tag.slug) ? [{ slug: tag.slug, label: tagLabel(tag.slug), title: MOMENTS[tag.slug]!, count: tag.count }] : []).slice(0, 3);
}
