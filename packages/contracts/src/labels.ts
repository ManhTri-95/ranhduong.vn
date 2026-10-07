import type { PlaceCategory } from './enums.js';
import type { ItineraryPace, ItineraryTransport } from './itinerary.js';

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

/** Phương tiện, viết thường vì đứng giữa dòng meta. */
export const TRANSPORT_LABEL: Record<ItineraryTransport, string> = { motorbike: 'xe máy', car: 'ô tô', taxi: 'taxi' };

/** Nhịp độ: thong thả khoảng 4 điểm mỗi ngày, dày lịch khoảng 6 (technical-design mục 7). */
export const PACE_LABEL: Record<ItineraryPace, string> = { relaxed: 'thong thả', packed: 'dày lịch' };

/** "1 ngày", "3 ngày 2 đêm". */
export function formatTripLength(days: number): string {
  return days > 1 ? `${days} ngày ${days - 1} đêm` : `${days} ngày`;
}

/** Dòng meta trên thẻ lịch trình: "3 ngày 2 đêm · xe máy · thong thả". */
export function itineraryMeta(card: { days: number; transport: ItineraryTransport; pace: ItineraryPace }): string {
  return [formatTripLength(card.days), TRANSPORT_LABEL[card.transport], PACE_LABEL[card.pace]].join(' · ');
}
