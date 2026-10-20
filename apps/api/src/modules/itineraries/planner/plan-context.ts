import {
  inRainSeason,
  type CitySeason,
  type ItineraryPace,
  type ItineraryPlace,
  type ItineraryRequest,
  type ItineraryZone,
  type StopKind,
  type TripInterest,
  type TripWith,
} from '@ranhduong/contracts';
import { tripCalendar, type TripDay } from './calendar';
import { isEligible, isLeisurePlace, isVisitPlace } from './candidates';
import { byScore, interestMatch, popularityShares, scorePlace, type ScoredPlace } from './scoring';

/** Số điểm tham quan mỗi ngày, chưa tính bữa ăn (technical-design mục 7). */
export const VISITS_PER_DAY = { relaxed: 4, packed: 6 } as const satisfies Record<ItineraryPace, number>;
/** Ngày dưới số này là thiếu điểm (technical-design mục 7 bước 12). */
export const MIN_VISITS_PER_DAY = 3;
/** Ngày thứ 5 đi nhịp thong thả, được dùng lại cụm (backlog lát 2, quyết định 1). */
export const LEISURE_DAY = 5;

/** Lịch trình mẫu published cùng thành phố, phần thuật toán cần. */
export interface PlanTemplate {
  id: string;
  tags: readonly TripInterest[];
  with?: TripWith;
  days: readonly { stops: readonly { placeId: string; kind: StopKind }[] }[];
}

export interface PlanInput {
  /** Đã validate bằng createItineraryRequestSchema của thành phố. */
  request: ItineraryRequest;
  /** Snapshot địa điểm của thành phố. */
  places: readonly ItineraryPlace[];
  /** Theo thứ tự dữ liệu thành phố; thứ tự này phân định khi hai tổ hợp cụm bằng điểm. */
  zones: readonly ItineraryZone[];
  seasons: readonly CitySeason[];
  templates: readonly PlanTemplate[];
  /** Số thô 30 ngày theo placeId; thiếu là 0. */
  popularity: ReadonlyMap<string, number>;
  now: Date;
}

export interface DayPool {
  trip: TripDay;
  rainy: boolean;
  pace: ItineraryPace;
  target: number;
  /** Mọi điểm hợp lệ trong ngày, mọi danh mục (điểm của mẫu dùng). */
  scored: ReadonlyMap<string, ScoredPlace>;
  /** Điểm tham quan hợp lệ (ngày 5: chỉ điểm thong thả), sắp byScore. */
  visits: readonly ScoredPlace[];
}

export interface PlanContext {
  request: ItineraryRequest;
  zones: readonly ItineraryZone[];
  places: ReadonlyMap<string, ItineraryPlace>;
  templates: readonly PlanTemplate[];
  days: readonly DayPool[];
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Chấm điểm ứng viên cho từng ngày. Sắp places, templates theo id để thứ tự đọc từ DB không đổi kết quả. */
export function prepare(input: PlanInput): PlanContext {
  const places = [...input.places].sort(byId);
  const zoneIds = new Set(input.zones.map((zone) => zone.id));
  const shares = popularityShares(places.map((place) => place.id), input.popularity);
  const days = tripCalendar(input.request.startDate, input.request.days).map((trip): DayPool => {
    const rainy = inRainSeason(input.seasons, trip.monthDay);
    const pace = trip.day === LEISURE_DAY ? 'relaxed' : input.request.pace;
    const filter = { weekday: trip.weekday, transport: input.request.transport, now: input.now, zoneIds };
    const eligible = places.filter((place) => isEligible(place, filter)).map((place): ScoredPlace => ({
      place,
      score: scorePlace(place, { request: input.request, popularityShare: shares.get(place.id) ?? 0, rainy }),
      match: interestMatch(place, input.request),
    }));
    const visits = eligible.filter(({ place }) => isVisitPlace(place) && (trip.day !== LEISURE_DAY || isLeisurePlace(place))).sort(byScore);
    return { trip, rainy, pace, target: VISITS_PER_DAY[pace], scored: new Map(eligible.map((s) => [s.place.id, s])), visits };
  });
  return { request: input.request, zones: input.zones, places: new Map(places.map((p) => [p.id, p])), templates: [...input.templates].sort(byId), days };
}
