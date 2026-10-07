import { MAX_FILTER_TAGS, PlaceCursor, Slug, type PlaceCard } from '@ranhduong/contracts';
import type { PlaceListParams } from '../api/places';

/** Số chỗ mỗi trang trên trang danh mục và khu vực. */
export const LISTING_PAGE_SIZE = 20;

/** Bộ lọc của trang danh sách đọc từ URL: thẻ (sắp a-z, không lặp) và cursor trang sau. */
export interface ListingFilter {
  tags: string[];
  cursor?: string;
}

type QueryValue = string | null | (string | null)[] | undefined;

const strings = (value: QueryValue): string[] =>
  (Array.isArray(value) ? value : [value]).filter((s): s is string => typeof s === 'string');

/**
 * Đọc `?tags=a,b&cursor=…` (nhận cả `?tags=a&tags=b` gõ tay). Thẻ sai định dạng, phần quá số thẻ tối đa và cursor sai
 * bị bỏ qua: URL gõ tay hay cursor cũ vẫn ra trang, thay vì gửi nguyên lên API để nhận 400.
 */
export function parseListingQuery(query: Record<string, QueryValue>): ListingFilter {
  const tags = [...new Set(strings(query.tags).flatMap((s) => s.split(',')).map((s) => s.trim()))]
    .filter((tag) => Slug.safeParse(tag).success)
    .sort()
    .slice(0, MAX_FILTER_TAGS);
  const cursor = strings(query.cursor)[0];
  return cursor !== undefined && PlaceCursor.safeParse(cursor).success ? { tags, cursor } : { tags };
}

/** Bật hoặc tắt một thẻ; kết quả sắp a-z để mỗi tổ hợp thẻ chỉ có một URL. */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  return (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]).sort();
}

/** Đường dẫn trang danh sách kèm thẻ và cursor. Slug và cursor chỉ gồm a-z, 0-9, `-`, `.` nên không cần mã hoá. */
export function listingHref(path: string, tags: readonly string[], cursor?: string): string {
  const params = [...(tags.length ? [`tags=${tags.join(',')}`] : []), ...(cursor ? [`cursor=${cursor}`] : [])];
  return params.length ? `${path}?${params.join('&')}` : path;
}

/** Chỉ trang gốc (không lọc thẻ, trang đầu) cho Google index; trang lọc và trang sau là noindex, follow. */
export function isIndexableListing(filter: ListingFilter): boolean {
  return filter.tags.length === 0 && filter.cursor === undefined;
}

/** Phần query API ứng với bộ lọc trên URL. */
export function listingApiParams(filter: ListingFilter): Pick<PlaceListParams, 'tags' | 'cursor'> {
  return { tags: filter.tags.length ? filter.tags.join(',') : undefined, cursor: filter.cursor };
}

/** Key của useFetch: mỗi bộ tham số một key, để SSR và lần hydrate dùng chung dữ liệu đã tải. */
export function placeListKey(citySlug: string, params: PlaceListParams): string {
  return ['places', citySlug, params.q, params.category, params.zone, params.tags, params.cursor, params.limit]
    .map((part) => part ?? '')
    .join(':');
}

/** Nối trang vừa tải vào danh sách đang hiện, bỏ chỗ đã có (dữ liệu đổi giữa hai lần tải). */
export function appendUnique(shown: readonly PlaceCard[], more: readonly PlaceCard[]): PlaceCard[] {
  const seen = new Set(shown.map((place) => place.slug));
  return [...shown, ...more.filter((place) => !seen.has(place.slug))];
}
