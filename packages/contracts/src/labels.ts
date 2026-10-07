import type { PlaceCategory } from './enums.js';

/** Tên danh mục hiển thị cho người dùng. */
export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  cafe: 'Cà phê',
  food: 'Ăn uống',
  attraction: 'Tham quan',
  activity: 'Hoạt động',
  stay: 'Lưu trú',
  shop: 'Mua sắm',
};

/** Danh mục có trang công khai ở lát 1, theo thứ tự hiện trên trang chủ. Lưu trú đi qua affiliate, mua sắm để sau. */
export const PUBLIC_CATEGORIES = ['cafe', 'food', 'attraction', 'activity'] as const satisfies readonly PlaceCategory[];
export type PublicCategory = (typeof PUBLIC_CATEGORIES)[number];

/** Slug URL trang danh mục `/{city}/{slug}` (technical-design mục 11, ADR 0010). Không đổi khi chưa hỏi chủ dự án. */
export const CATEGORY_URL_SLUG: Record<PublicCategory, string> = {
  cafe: 'ca-phe',
  food: 'an-uong',
  attraction: 'tham-quan',
  activity: 'hoat-dong',
};
