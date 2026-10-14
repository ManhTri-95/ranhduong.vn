import type { ItineraryPublicStop } from '@ranhduong/contracts';
import type { ItineraryDay } from '~/entities/itinerary/lib/itinerary-summary';

/** Toạ độ top (px, theo viewport) của vòng số mỗi điểm, theo thứ tự trong trang. */
export interface StopRow { key: string; top: number }

/** Điểm đang xem: vòng số cuối cùng đã lên tới vạch probeY; chưa tới điểm nào thì là điểm đầu. */
export function activeStopKey(rows: readonly StopRow[], probeY: number): string | null {
  let active = rows[0]?.key ?? null;
  for (const row of rows) {
    if (row.top > probeY) break;
    active = row.key;
  }
  return active;
}

export function findStop(days: readonly ItineraryDay[], key: string | null): ItineraryPublicStop | undefined {
  return key ? days.flatMap((day) => day.stops).find((stop) => stop.key === key) : undefined;
}

export function dayOfStop(days: readonly ItineraryDay[], key: string | null): number | undefined {
  return key ? days.find((day) => day.stops.some((stop) => stop.key === key))?.day : undefined;
}

/** Điểm đầu tiên có vị trí, chọn sẵn khi mở bản đồ hoặc đổi ngày. */
export function firstLocatedKey(stops: readonly ItineraryPublicStop[]): string | null {
  return stops.find((stop) => stop.place?.location)?.key ?? null;
}

export type ActionBarMode = 'directions' | 'show-map' | 'no-location';

/**
 * Nút chính của thanh hành động: chỉ đường khi điểm có vị trí; điểm chưa có vị trí thì mở bản đồ ngày
 * (chỉ khi bản đồ đang ẩn và mở được), còn lại chỉ báo "chưa có vị trí" chứ không để nút không làm gì.
 */
export function actionBarMode(stop: ItineraryPublicStop | null, view: { mapVisible: boolean; canShowMap: boolean }): ActionBarMode {
  if (stop?.place?.location) return 'directions';
  return !view.mapVisible && view.canShowMap ? 'show-map' : 'no-location';
}
