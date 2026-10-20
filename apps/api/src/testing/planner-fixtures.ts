import type { CitySeason, ItineraryPlace, ItineraryRequest, ItineraryZone, OpeningSlot, TripInterest, TripWith } from '@ranhduong/contracts';
import type { PlanInput, PlanTemplate } from '../modules/itineraries/planner/plan-context';

// Dữ liệu giả cho test thuật toán lịch trình: tên rõ là giả, toạ độ quanh [0, 0] để không trùng địa điểm thật nào.

const DAY_MS = 86_400_000;

/** Thời điểm chạy thuật toán trong test. */
export const NOW = new Date('2026-11-20T03:00:00Z');

const zone = (i: number, slug: string, name: string, adjacentZones: string[]): ItineraryZone => ({ id: `${'e'.repeat(23)}${i}`, slug, name, adjacentZones });

/** Bốn cụm giả theo thứ tự dữ liệu thành phố, đồ thị kề giống Đà Lạt (cấm Bắc–Đông, Nam–Bắc không kề). */
export const ZONES: ItineraryZone[] = [
  zone(0, 'cum-trung-tam-gia-lap', 'Cụm Trung Tâm Giả Lập', ['cum-nam-gia-lap', 'cum-bac-gia-lap', 'cum-dong-gia-lap']),
  zone(1, 'cum-nam-gia-lap', 'Cụm Nam Giả Lập', ['cum-trung-tam-gia-lap', 'cum-dong-gia-lap']),
  zone(2, 'cum-bac-gia-lap', 'Cụm Bắc Giả Lập', ['cum-trung-tam-gia-lap']),
  zone(3, 'cum-dong-gia-lap', 'Cụm Đông Giả Lập', ['cum-trung-tam-gia-lap', 'cum-nam-gia-lap']),
];

/** Điểm tham quan giả số `n`: hoạt động, cụm đầu tiên, mở mọi ngày 07:00–22:00, xác minh 10 ngày trước NOW. */
export function fakePlace(n: number, overrides: Partial<ItineraryPlace> = {}): ItineraryPlace {
  return {
    id: n.toString(16).padStart(24, '0'),
    name: `Điểm Giả Lập ${n}`,
    slug: `diem-gia-lap-${n}`,
    category: 'attraction',
    alsoCategories: [],
    status: 'active',
    zoneId: ZONES[0]!.id,
    location: { type: 'Point', coordinates: [0.1 + n / 1000, 0.1] },
    openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '07:00', close: '22:00' })),
    lastVerifiedAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString(),
    validPhoto: true,
    tags: [],
    bestTime: [],
    transport: [],
    ...overrides,
  };
}

/** `count` điểm giả số firstN, firstN + 1, … trong cụm ZONES[zoneIndex]. */
export function placesIn(zoneIndex: number, count: number, firstN: number, overrides: Partial<ItineraryPlace> = {}): ItineraryPlace[] {
  return Array.from({ length: count }, (_, i) => fakePlace(firstN + i, { zoneId: ZONES[zoneIndex]!.id, ...overrides }));
}

/** Yêu cầu giả: 1 ngày từ Thứ Hai 23/11/2026, xe máy, nhóm bạn, không gu, thong thả. */
export function fakeRequest(overrides: Partial<ItineraryRequest> = {}): ItineraryRequest {
  return { days: 1, startDate: '2026-11-23', transport: 'motorbike', with: 'friends', tags: [], pace: 'relaxed', ...overrides };
}

/** Mùa giả đủ trường CitySeason; test ghi đè kind, from, to. */
export const SEASON_GIA_LAP: CitySeason = {
  key: 'mua-gia-lap', kind: 'other', from: '01-01', to: '01-31', accent: '#123456', title: 'Mùa Giả Lập', sub: 'Mô tả Giả Lập', illustration: 'gia-lap',
};

/** Đầu vào thuật toán: yêu cầu giả, chưa có điểm, bốn cụm giả, không mùa, không mẫu, chưa có số liệu phổ biến. */
export function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return { request: fakeRequest(), places: [], zones: ZONES, seasons: [], templates: [], popularity: new Map(), now: NOW, ...overrides };
}

/** Mẫu giả: mỗi ngày là danh sách placeId, mọi điểm là điểm ghé. */
export function fakeTemplate(id: string, tags: TripInterest[], days: string[][], w?: TripWith): PlanTemplate {
  return { id, tags, with: w, days: days.map((ids) => ({ stops: ids.map((placeId) => ({ placeId, kind: 'visit' as const })) })) };
}

/** Một ca `open`–`close` cho mỗi thứ 0–6. */
export function allDays(open: string, close: string): OpeningSlot[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open, close }));
}
