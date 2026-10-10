import {
  CATEGORY_LABEL,
  encodePlaceCursor,
  needsOwnerConfirmation,
  tagLabel,
  type FeaturedKey,
  type GeoPoint,
  type OpeningSlot,
  type PlaceCard,
  type PlaceCategory,
  type TagCount,
  type VerifySource,
} from '@ranhduong/contracts';
import { matchScore } from '@ranhduong/geo';

/** Các trường của Place cần cho thẻ và xếp hạng; repository chỉ đọc đúng các trường này. */
export interface ListedPlace {
  id?: string;
  slug: string;
  name: string;
  aliases: string[];
  tags: string[];
  category: PlaceCategory;
  alsoCategories: PlaceCategory[];
  zoneId?: string;
  practicalNotes?: string;
  openingHours: OpeningSlot[];
  verifySource?: VerifySource;
  lastVerifiedAt?: Date;
  coverKey?: string;
  location?: GeoPoint;
}

/** Khoá xếp hạng nổi bật của một địa điểm (cũng là nội dung cursor phân trang). */
export function featuredKey(place: ListedPlace): FeaturedKey {
  return { owner: place.verifySource === 'owner', verifiedAt: place.lastVerifiedAt?.getTime() ?? null, slug: place.slug };
}

/** Quán đã xác nhận trước, rồi xác minh gần nhất, chưa xác minh xếp cuối, cùng hạng theo slug. */
export function compareFeaturedKey(a: FeaturedKey, b: FeaturedKey): number {
  if (a.owner !== b.owner) return a.owner ? -1 : 1;
  const at = a.verifiedAt ?? Number.NEGATIVE_INFINITY;
  const bt = b.verifiedAt ?? Number.NEGATIVE_INFINITY;
  if (at !== bt) return bt > at ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** Thứ tự "nổi bật" của địa điểm (xem compareFeaturedKey). */
export function compareFeatured(a: ListedPlace, b: ListedPlace): number {
  return compareFeaturedKey(featuredKey(a), featuredKey(b));
}

export interface FeaturedPage {
  items: ListedPlace[];
  /** Khoá của chỗ cuối trang, chỉ có khi còn trang sau. */
  nextCursor?: string;
}

/**
 * Một trang theo thứ tự nổi bật, bắt đầu ngay sau `after` (khoá của chỗ cuối trang trước).
 * Không dựa vào vị trí trong mảng, nên chỗ ở cursor bị ẩn hay có chỗ mới chen vào thì trang sau vẫn không trùng, không sót.
 */
export function pageByFeatured(places: ListedPlace[], after: FeaturedKey | undefined, limit: number): FeaturedPage {
  const sorted = [...places].sort(compareFeatured);
  const start = after ? sorted.findIndex((place) => compareFeaturedKey(featuredKey(place), after) > 0) : 0;
  if (start === -1) return { items: [] };
  const items = sorted.slice(start, start + limit);
  const last = items.at(-1);
  return start + limit < sorted.length && last ? { items, nextCursor: encodePlaceCursor(featuredKey(last)) } : { items };
}

/** Địa điểm có đủ mọi thẻ cần lọc ("và"); không lọc thẻ nào thì luôn đúng. */
export function hasAllTags(place: ListedPlace, tags: readonly string[]): boolean {
  return tags.every((tag) => place.tags.includes(tag));
}

/** Số địa điểm theo từng thẻ (thẻ lặp trong một địa điểm tính một lần); nhiều chỗ trước, bằng nhau theo slug. */
export function countTags(places: ListedPlace[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    for (const tag of new Set(place.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/** Lọc theo từ khoá không dấu: khớp tên tốt hơn đứng trước, cùng mức khớp thì theo thứ tự nổi bật. */
export function searchPlaces(places: ListedPlace[], q: string): ListedPlace[] {
  return places
    .map((place) => {
      const labels = [place.category, ...place.alsoCategories].map((c) => CATEGORY_LABEL[c]);
      const tags = place.tags.flatMap((tag) => [tag, tagLabel(tag)]);
      return { place, score: matchScore(q, place.name, [...place.aliases, ...labels, ...tags]) };
    })
    .filter((ranked) => ranked.score > 0)
    .sort((a, b) => b.score - a.score || compareFeatured(a.place, b.place))
    .map((ranked) => ranked.place);
}

const NOTE_MAX = 90;

/** Câu đầu của dòng đầu trong ghi chú thực tế, tối đa 90 ký tự, cắt ở ranh giới từ. */
export function cardNote(text?: string): string | undefined {
  const firstLine = text?.trim().split(/\r?\n/)[0]?.trim();
  if (!firstLine) return undefined;
  const sentence = /^.*?[.!?…](?=\s|$)/.exec(firstLine)?.[0] ?? firstLine;
  if (sentence.length <= NOTE_MAX) return sentence;
  const cut = sentence.slice(0, NOTE_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '')}…`;
}

/** Đổi bản ghi thành thẻ công khai; tên cụm tra trong zoneNames (zoneId → tên). */
export function toPlaceCard(place: ListedPlace, zoneNames: ReadonlyMap<string, string>): PlaceCard {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    ...(place.alsoCategories.length > 0 ? { alsoCategories: place.alsoCategories } : {}),
    zoneName: place.zoneId ? zoneNames.get(place.zoneId) : undefined,
    note: cardNote(place.practicalNotes),
    openingHours: place.openingHours,
    unconfirmed: needsOwnerConfirmation(place),
    coverKey: place.coverKey,
  };
}
