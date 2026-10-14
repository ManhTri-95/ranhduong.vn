import { CATEGORY_LABEL, type PlaceCard } from '@ranhduong/contracts';

/** Dòng tổng quan đầu trang danh sách: số địa điểm, danh mục chính và khu vực theo thứ tự xuất hiện, không trùng. */
export function curatedListSummary(places: readonly Pick<PlaceCard, 'category' | 'zoneName'>[]): string {
  if (!places.length) return '';
  const categories = [...new Set(places.map((place) => CATEGORY_LABEL[place.category]))];
  const zones = [...new Set(places.flatMap((place) => (place.zoneName ? [place.zoneName] : [])))];
  return [`${places.length} địa điểm`, categories.join(', '), zones.join(', ')].filter(Boolean).join(' · ');
}
