import {
  TRIP_INTEREST_BEST_TIMES,
  TRIP_INTEREST_TAGS,
  TRIP_WITH_TAGS,
  type BestTime,
  type ItineraryPlace,
  type ItineraryRequest,
} from '@ranhduong/contracts';

/** Trọng số khởi đầu (technical-design mục 7 bước 4), chỉnh theo dữ liệu thật. */
export const SCORE_WEIGHTS = { interest: 0.5, popularity: 0.3, rating: 0.2 } as const;
/** Ngày trong mùa mưa: cộng điểm cho điểm trú mưa được, che hết rồi che một phần (giá trị khởi đầu). */
export const RAIN_COVER_BONUS = { full: 0.2, partial: 0.1 } as const;
/** Hai điểm số chênh nhau không quá EPS coi như bằng nhau, để sai số dấu phẩy động không đổi kết quả. */
export const EPS = 1e-9;

type Preferences = Pick<ItineraryRequest, 'tags' | 'with'>;

/** Mỗi gu đã chọn là một tiêu chí; Gia đình thêm tiêu chí thẻ gia-dinh. */
function criteria(request: Preferences): { tags: readonly string[]; bestTimes: readonly BestTime[] }[] {
  const withTags = TRIP_WITH_TAGS[request.with];
  return [
    ...request.tags.map((interest) => ({ tags: TRIP_INTEREST_TAGS[interest], bestTimes: TRIP_INTEREST_BEST_TIMES[interest] })),
    ...(withTags.length > 0 ? [{ tags: withTags, bestTimes: [] }] : []),
  ];
}

/** Tỉ lệ tiêu chí khớp (0..1); gu chỉ cộng điểm, không dùng để loại điểm. Không có tiêu chí thì 0. */
export function interestMatch(place: Pick<ItineraryPlace, 'tags' | 'bestTime'>, request: Preferences): number {
  const list = criteria(request);
  if (list.length === 0) return 0;
  const matched = list.filter((c) => c.tags.some((tag) => place.tags.includes(tag)) || c.bestTimes.some((time) => place.bestTime.includes(time)));
  return matched.length / list.length;
}

/** Độ phổ biến chuẩn hoá: số thô chia cho max của snapshot; thiếu số liệu hoặc max bằng 0 thì 0. */
export function popularityShares(placeIds: readonly string[], popularity: ReadonlyMap<string, number>): Map<string, number> {
  const max = Math.max(0, ...placeIds.map((id) => popularity.get(id) ?? 0));
  return new Map(placeIds.map((id) => [id, max > 0 ? (popularity.get(id) ?? 0) / max : 0]));
}

export function scorePlace(place: ItineraryPlace, ctx: { request: Preferences; popularityShare: number; rainy: boolean }): number {
  const rain = ctx.rainy && (place.cover === 'full' || place.cover === 'partial') ? RAIN_COVER_BONUS[place.cover] : 0;
  return SCORE_WEIGHTS.interest * interestMatch(place, ctx.request)
    + SCORE_WEIGHTS.popularity * ctx.popularityShare
    + SCORE_WEIGHTS.rating * ((place.ratingAvg ?? 0) / 5)
    + rain;
}

/** Điểm bình minh ghim đầu ngày, điểm buổi tối ghim cuối ngày (technical-design mục 7 bước 6). */
export function pinOf(place: Pick<ItineraryPlace, 'bestTime'>): 'first' | 'last' | undefined {
  if (place.bestTime.includes('sunrise')) return 'first';
  return place.bestTime.includes('evening') ? 'last' : undefined;
}

export interface ScoredPlace {
  place: ItineraryPlace;
  score: number;
  /** interestMatch của điểm, để giữ điểm hợp gu khi dùng mẫu. */
  match: number;
}

/** Điểm số giảm dần, hoà thì id tăng dần: cùng đầu vào luôn cùng thứ tự. */
export function byScore(a: ScoredPlace, b: ScoredPlace): number {
  if (Math.abs(a.score - b.score) > EPS) return b.score - a.score;
  return a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0;
}

/** Lấy tối đa `target` điểm theo thứ tự cho sẵn; bỏ điểm đã dùng, đã chọn và điểm ghim thứ hai cùng loại trong ngày. */
export function pickVisits(ranked: readonly ScoredPlace[], target: number, used: ReadonlySet<string>): ScoredPlace[] {
  const picks: ScoredPlace[] = [];
  const pins = new Set<string>();
  for (const candidate of ranked) {
    if (picks.length >= target) break;
    if (used.has(candidate.place.id) || picks.some((p) => p.place.id === candidate.place.id)) continue;
    const pin = pinOf(candidate.place);
    if (pin) {
      if (pins.has(pin)) continue;
      pins.add(pin);
    }
    picks.push(candidate);
  }
  return picks;
}
