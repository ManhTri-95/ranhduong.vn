import { BEST_TIME_LABEL, type BestTime, type GeoPoint, type PlaceCard, type PlaceDetail } from '@ranhduong/contracts';

export interface TravelNote { key: string; label: string; value: string; detail: string }

export type StoryChapter = 'place-reveal' | 'first-impression' | 'photo-journal' | 'before-you-go' | 'right-moment' | 'find-your-way' | 'make-it-your-journey' | 'next-turn';

/** Empty media/prose remains a small note, not a full numbered chapter. */
export function storyChapters(place: Pick<PlaceDetail, 'practicalNotes' | 'tags' | 'photos' | 'bestTime' | 'status'>): StoryChapter[] {
  return [
    'place-reveal',
    ...(place.practicalNotes || place.tags.length ? ['first-impression' as const] : []),
    ...(place.photos.length ? ['photo-journal' as const] : []),
    'before-you-go',
    ...(visitingMoments(place).length ? ['right-moment' as const] : []),
    ...(place.status === 'closed' ? [] : ['find-your-way' as const, 'make-it-your-journey' as const]),
    'next-turn',
  ];
}

/** Missing editorial fields are unknown, never a negative accessibility claim. */
export function travelNotes(place: PlaceDetail): TravelNote[] {
  const shelter = {
    full: ['Có mái che toàn bộ', 'Ghi chép hiện tại: không gian có mái che.'],
    partial: ['Có chỗ che mưa và ngoài trời', 'Mức mái che từng khu có thể khác nhau.'],
    none: ['Không có mái che', 'Cân nhắc thời tiết trước khi ghé.'],
  } as const;
  return [
    { key: 'price', label: 'Mức chi tiêu', value: place.priceLevel ? `Mức ${place.priceLevel} / 4` : 'Chưa rõ mức giá', detail: 'Thang giá tương đối, không phải giá niêm yết.' },
    { key: 'cover', label: 'Không gian & mái che', value: place.cover ? shelter[place.cover][0] : 'Chưa rõ mái che', detail: place.cover ? shelter[place.cover][1] : 'Hỏi địa điểm trước nếu bạn cần chỗ trú mưa.' },
    ...(['motorbike', 'car'] as const).map(key => ({ key, label: key === 'motorbike' ? 'Đi bằng xe máy' : 'Đi bằng ô tô', value: place.transport.includes(key) ? 'Có trong ghi chép' : 'Chưa rõ', detail: 'Hỏi thêm về đường vào và chỗ đỗ xe trước khi ghé.' })),
    { key: 'duration', label: 'Thời gian ghé', value: place.visitDurationMin ? `Khoảng ${place.visitDurationMin} phút` : 'Chưa rõ thời lượng', detail: 'Dành thêm thời gian theo nhịp đi của bạn.' },
  ];
}

const MOMENTS: readonly BestTime[] = ['sunrise', 'morning', 'afternoon', 'sunset', 'evening'];

export function visitingMoments(place: Pick<PlaceDetail, 'status' | 'bestTime'>) {
  if (place.status === 'closed' || !place.bestTime.length) return [];
  return MOMENTS.map(key => ({ key, label: BEST_TIME_LABEL[key], recommended: place.bestTime.includes(key) }));
}

export function coordinateLabel(location: GeoPoint | undefined): string | undefined {
  if (!location) return undefined;
  const [lng, lat] = location.coordinates;
  return `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? 'N' : 'B'} / ${Math.abs(lng).toFixed(4)}° ${lng < 0 ? 'T' : 'Đ'}`;
}

/** The detail response already has the real point. No extra viewport query is necessary. */
export function placeMapCard(place: PlaceDetail): PlaceCard | undefined {
  if (place.status === 'closed' || !place.location) return undefined;
  return {
    id: place.id, slug: place.slug, name: place.name, category: place.category,
    alsoCategories: place.alsoCategories, zoneName: place.zoneName, location: place.location,
    openingHours: place.openingHours, unconfirmed: place.unconfirmed, coverKey: place.photos[0]?.key,
  };
}
