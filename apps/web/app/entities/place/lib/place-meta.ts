import { CATEGORY_LABEL, type PlaceCard } from '@ranhduong/contracts';

/** Dòng meta của thẻ địa điểm: danh mục chính, danh mục phụ (S27), rồi cụm, ví dụ "Cà phê, Ăn uống · Trung tâm". */
export function placeMeta(card: Pick<PlaceCard, 'category' | 'alsoCategories' | 'zoneName'>): string {
  const categories = [card.category, ...(card.alsoCategories ?? [])].map((c) => CATEGORY_LABEL[c]).join(', ');
  return [categories, card.zoneName].filter(Boolean).join(' · ');
}
