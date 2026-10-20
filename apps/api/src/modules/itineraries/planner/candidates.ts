import {
  openingHoursIssues,
  servesCategory,
  verificationStale,
  type ItineraryPlace,
  type ItineraryTransport,
  type OpeningSlot,
  type PlaceCategory,
} from '@ranhduong/contracts';

/** Danh mục được làm điểm tham quan; quán chỉ là ăn uống dành cho bữa ăn (S35), lưu trú không bao giờ là điểm ghé. */
export const VISIT_CATEGORIES: readonly PlaceCategory[] = ['attraction', 'cafe', 'activity', 'shop'];
/** Ngày thứ 5 đi nhịp thong thả: cà phê, chợ, đặc sản (product-spec mục 8). */
export const LEISURE_CATEGORIES: readonly PlaceCategory[] = ['cafe', 'shop'];
export const LEISURE_TAGS: readonly string[] = ['dac-san'];

/** Điều kiện lọc của một ngày trong chuyến. */
export interface DayFilter {
  weekday: number;
  transport: ItineraryTransport;
  now: Date;
  /** Id các cụm của thành phố. */
  zoneIds: ReadonlySet<string>;
}

/** Có ca mở trong đúng thứ đó; phần sau nửa đêm của ca hôm trước không tính là mở ngày này. */
export function opensOn(slots: readonly OpeningSlot[], weekday: number): boolean {
  return slots.some((slot) => slot.day === weekday && slot.open !== slot.close);
}

/**
 * Ứng viên của một ngày (technical-design mục 7 bước 3): active, xác minh trong 90 ngày, có toạ độ, cụm của thành phố,
 * giờ mở cửa hợp lệ, mở đúng thứ, hợp phương tiện. `transport` rỗng là chưa nhập nên không loại; taxi tính như ô tô.
 */
export function isEligible(place: ItineraryPlace, filter: DayFilter): boolean {
  const mode = filter.transport === 'motorbike' ? 'motorbike' : 'car';
  return place.status === 'active'
    && !verificationStale(place.lastVerifiedAt, filter.now)
    && place.location !== undefined
    && place.zoneId !== undefined && filter.zoneIds.has(place.zoneId)
    && openingHoursIssues(place.openingHours).length === 0
    && opensOn(place.openingHours, filter.weekday)
    && (place.transport.length === 0 || place.transport.includes(mode));
}

export function isVisitPlace(place: Pick<ItineraryPlace, 'category' | 'alsoCategories'>): boolean {
  return VISIT_CATEGORIES.some((category) => servesCategory(place, category));
}

export function isLeisurePlace(place: Pick<ItineraryPlace, 'category' | 'alsoCategories' | 'tags'>): boolean {
  return LEISURE_CATEGORIES.some((category) => servesCategory(place, category)) || place.tags.some((tag) => LEISURE_TAGS.includes(tag));
}
