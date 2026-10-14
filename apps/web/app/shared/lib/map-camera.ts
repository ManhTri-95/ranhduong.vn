import type { BBox } from '@ranhduong/contracts';

export interface MapInsets { top: number; bottom: number }
export interface MapView { center: [number, number]; zoom: number }

/** Mức zoom nhỏ nhất của bản đồ thành phố (ui-spec mục 6). */
export const MAP_MIN_ZOOM = 11;
const MAP_MAX_ZOOM = 22;

/** Chỉ dịch bản đồ khi ghim đang bị header, sheet hoặc mép màn hình che; ghim đã thấy thì giữ nguyên khung nhìn. */
export function needsPan(point: { x: number; y: number }, size: { width: number; height: number }, insets: MapInsets, margin = 48): boolean {
  return point.x < margin || point.x > size.width - margin
    || point.y < insets.top + margin || point.y > size.height - insets.bottom - margin;
}

/** Khung nhìn đã lưu chỉ được dùng lại khi còn nằm trong vùng thành phố và đúng giới hạn zoom. */
export function restorableView(saved: MapView | undefined, bounds: BBox, minZoom = MAP_MIN_ZOOM): MapView | undefined {
  if (!saved) return undefined;
  const [lng, lat] = saved.center;
  const [west, south, east, north] = bounds;
  const inside = lng >= west && lng <= east && lat >= south && lat <= north;
  return inside && saved.zoom >= minZoom && saved.zoom <= MAP_MAX_ZOOM ? saved : undefined;
}
