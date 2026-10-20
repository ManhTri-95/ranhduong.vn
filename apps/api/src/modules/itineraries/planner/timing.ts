import { clockMinutes, scheduleDay, type DaySchedule, type GeoPoint, type ItineraryPlace, type StopKind } from '@ranhduong/contracts';
import { estimateTemplateTravelMinutes } from '@ranhduong/geo';
import type { RouteStop } from './route';
import { byScore, pinOf, type ScoredPlace } from './scoring';

/** Mô hình thời gian, giá trị khởi đầu ở technical-design mục 7. */
export const DAY_START = '07:00';
/** Ngày có điểm bình minh ghim đầu. */
export const SUNRISE_START = '04:45';
/** Gửi xe, đi bộ: cộng vào mỗi chặng di chuyển. */
export const TRAVEL_BUFFER_MIN = 10;
/** Điểm ghé thường chờ quán mở tối đa bấy nhiêu phút; trước DAY_START chờ không giới hạn. */
export const OPEN_WAIT_MAX_MIN = 30;

/** Một điểm dừng trong ngày: điểm tham quan hoặc bữa ăn. */
export interface DayStop extends RouteStop {
  place: ItineraryPlace;
  kind: StopKind;
  score: number;
  /** Phút từ 00:00; bữa ăn không bắt đầu trước đầu khung giờ ăn. */
  notBefore?: number;
}

export function toDayStop(scored: ScoredPlace, kind: StopKind): DayStop | undefined {
  const { place, score } = scored;
  if (!place.location) return undefined;
  const pin = kind === 'visit' ? pinOf(place) : undefined;
  return { place, kind, score, location: place.location, ...(pin ? { pin } : {}) };
}

const latLng = (point: GeoPoint) => ({ lng: point.coordinates[0], lat: point.coordinates[1] });

/** Phút xếp giờ của một chặng: chim bay làm tròn 5 phút cộng đệm. */
export function legMinutes(a: GeoPoint, b: GeoPoint): number {
  return estimateTemplateTravelMinutes(latLng(a), latLng(b)) + TRAVEL_BUFFER_MIN;
}

export function dayStartTime(stops: readonly DayStop[]): string {
  return stops[0]?.pin === 'first' ? SUNRISE_START : DAY_START;
}

/** Xếp giờ bằng hàm chung với kiểm tra mẫu S15, thêm quy tắc chờ quán mở của thuật toán. */
export function timeStops(stops: readonly DayStop[], weekday: number): DaySchedule {
  return scheduleDay(
    stops.map((stop) => ({
      placeId: stop.place.id, kind: stop.kind, notBefore: stop.notBefore,
      maxWaitMin: stop.pin === 'last' ? 1440 : OPEN_WAIT_MAX_MIN,
    })),
    {
      startTime: dayStartTime(stops), weekday, travel: legMinutes, freeWaitUntil: clockMinutes(DAY_START),
      places: new Map(stops.map((stop) => [stop.place.id, stop.place])),
    },
  );
}

const violations = (stops: readonly DayStop[], weekday: number) => timeStops(stops, weekday).stops.flatMap((t, i) => (t.withinHours ? [] : [i]));

function swapped(stops: readonly DayStop[], i: number, j: number): DayStop[] {
  const next = [...stops];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/**
 * Sửa sai giờ mở cửa (technical-design mục 7 bước 8): điểm sai giờ đầu tiên thử đổi với điểm kề trước rồi sau
 * (không đổi điểm ghim), nhận khi số điểm sai giờ giảm; không được thì bỏ điểm điểm số thấp nhất trong các điểm sai giờ.
 */
export function repairHours(stops: readonly DayStop[], weekday: number): DayStop[] {
  let order = [...stops];
  for (let bad = violations(order, weekday); bad.length > 0; bad = violations(order, weekday)) {
    const k = bad[0]!;
    const neighbor = [k - 1, k + 1].find((nb) => {
      const a = order[k];
      const b = order[nb];
      return a && b && !a.pin && !b.pin && violations(swapped(order, k, nb), weekday).length < bad.length;
    });
    if (neighbor !== undefined) {
      order = swapped(order, k, neighbor);
      continue;
    }
    const worst = bad.map((i) => order[i]!).sort(byScore).at(-1)!;
    order = order.filter((stop) => stop !== worst);
  }
  return order;
}
