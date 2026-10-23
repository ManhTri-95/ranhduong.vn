import { CATEGORY_URL_SLUG, type PublicCategory, type TagCount } from '@ranhduong/contracts';
import type { PlaceListParams } from '../api/places';
import { areaHref, areaMoments } from './area-guide';
import { discoveryHref, parseDiscoveryQuery, type DiscoveryFilter, type DiscoveryQuery } from './discovery-query';
import { LISTING_PAGE_SIZE } from './listing-query';
import { mapFilterQuery } from './map-query';

/** The category belongs to the route; area filters must belong to the actual city. */
export function parseCategoryQuery(query: DiscoveryQuery, zones: readonly string[]): DiscoveryFilter {
  const filter = parseDiscoveryQuery(query);
  return { ...filter, category: undefined, zone: filter.zone && zones.includes(filter.zone) ? filter.zone : undefined };
}
export function categoryApiParams(category: PublicCategory, filter: DiscoveryFilter): PlaceListParams {
  return { category, q: filter.q, zone: filter.zone, tags: filter.tags.length ? filter.tags.join(',') : undefined, rainSafe: filter.rainSafe ? 'true' : undefined, cursor: filter.q ? undefined : filter.cursor, limit: LISTING_PAGE_SIZE };
}
export function categoryMapHref(city: string, category: PublicCategory, filter: DiscoveryFilter): string {
  return `/${city}/ban-do?${new URLSearchParams(mapFilterQuery(category, filter.rainSafe, filter))}`;
}
export function categoryAreaHref(city: string, zone: string, category: PublicCategory, filter: DiscoveryFilter): string {
  return areaHref(`/${city}/khu-vuc/${zone}`, { q: filter.q, category, tags: filter.tags, rainSafe: filter.rainSafe });
}
export function categorySiblingHref(city: string, category: PublicCategory, filter: DiscoveryFilter): string {
  return discoveryHref(`/${city}/${CATEGORY_URL_SLUG[category]}`, { zone: filter.zone, rainSafe: filter.rainSafe, tags: [] });
}
export function categoryMoments(tags: readonly TagCount[]) { return areaMoments(tags.filter(tag => tag.count > 0)); }

/** Editorial voice only; no suitability, popularity or verification claims. */
export const CATEGORY_IDENTITY = {
  cafe: { lines: ['Một ly cà phê.', 'Một góc thật riêng.'], description: 'Chọn một góc ngồi, tìm một nhịp chậm. Mở những ghi chép và tìm quán cà phê hợp với chuyến đi của bạn.', annotation: 'Ngồi lại một chút.', accent: 'var(--ink)', surface: 'var(--mist)' },
  food: { lines: ['Theo một hương thơm.', 'Ghé một bữa ngon.'], description: 'Đôi khi, nhớ một nơi là nhớ một bữa ăn. Tìm chỗ ăn theo gu, xem ghi chú thực tế rồi chọn nơi muốn ghé.', annotation: 'Đi theo hương vị.', accent: 'var(--route-rust)', surface: 'var(--map-land)' },
  attraction: { lines: ['Đi để thấy.', 'Dừng để nhớ.'], description: 'Để dành một khoảng trống cho điều mới. Mở từng ghi chép tham quan, tìm một điểm dừng cho hành trình của mình.', annotation: 'Nhìn thêm một chút.', accent: 'var(--ink)', surface: 'var(--mist)' },
  activity: { lines: ['Thử một điều mới.', 'Kể thêm chuyện hay.'], description: 'Chuyến đi có thêm màu khi bạn thử điều mình thích. Khám phá những hoạt động trong ghi chép và tự chọn trải nghiệm tiếp theo.', annotation: 'Đi thử thôi.', accent: 'var(--route-rust)', surface: 'var(--note)' },
} as const satisfies Record<PublicCategory, { lines: readonly string[]; description: string; annotation: string; accent: string; surface: string }>;
