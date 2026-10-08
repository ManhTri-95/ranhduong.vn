import type { BestTime, PlaceCategory, PlaceCover, PlaceStatus, Transport } from './enums.js';
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

/** Danh mục của trang `/{city}/{slug}`; slug không phải danh mục công khai thì undefined. */
export function categoryFromUrlSlug(urlSlug: string): PublicCategory | undefined {
  return PUBLIC_CATEGORIES.find((category) => CATEGORY_URL_SLUG[category] === urlSlug);
}

/**
 * Tên hiển thị của thẻ. Thẻ được phép dùng nằm ở tab "Tags" của Google Sheet nhập liệu (docs/data-collection.md);
 * thêm thẻ vào tab đó thì thêm tên ở đây.
 */
export const TAG_LABEL: Readonly<Record<string, string>> = {
  chill: 'Chill',
  'view-doi': 'View đồi',
  'song-ao': 'Sống ảo',
  'gia-dinh': 'Gia đình',
  'mao-hiem': 'Mạo hiểm',
  'an-sang': 'Ăn sáng',
  'dac-san': 'Đặc sản',
};

/** Tên của thẻ; thẻ chưa có trong TAG_LABEL thì hiện slug, gạch nối thành khoảng trắng, viết hoa chữ đầu. */
export function tagLabel(slug: string): string {
  // Object.hasOwn: slug "constructor" không được lấy nhầm hàm của Object.prototype.
  if (Object.hasOwn(TAG_LABEL, slug)) return TAG_LABEL[slug] ?? slug;
  const words = slug.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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

/** Thời điểm đẹp để ghé (Place.bestTime). */
export const BEST_TIME_LABEL: Record<BestTime, string> = {
  sunrise: 'Bình minh',
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  sunset: 'Hoàng hôn',
  evening: 'Buổi tối',
};

/** Phương tiện tới được địa điểm (Place.transport), viết hoa vì đứng đầu nhãn chọn. */
export const PLACE_TRANSPORT_LABEL: Record<Transport, string> = { motorbike: 'Xe máy', car: 'Ô tô' };

/** Trạng thái địa điểm trong quản trị (ui-spec mục 12). */
export const PLACE_STATUS_LABEL: Record<PlaceStatus, string> = {
  draft: 'Nháp',
  active: 'Đang hiển thị',
  suspected: 'Bị nghi ngờ',
  hidden: 'Đã ẩn',
  closed: 'Đã đóng cửa',
  merged: 'Đã gộp',
};

/** Chip mái che trên trang địa điểm. */
export const COVER_LABEL: Record<PlaceCover, string> = {
  full: 'Trong nhà',
  partial: 'Trong nhà và ngoài trời',
  none: 'Ngoài trời',
};
