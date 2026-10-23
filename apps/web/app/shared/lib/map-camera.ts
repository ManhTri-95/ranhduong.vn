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

/** Camera pans caused by choosing a card never trigger discovery requests. */
export function viewportAction(initialized: boolean, interactive: boolean, searched: BBox | undefined, next: BBox): 'load' | 'offer' | 'none' {
  if (!initialized) return 'load';
  if (!interactive) return 'none';
  return searched && next.every((value, index) => Math.abs(value - searched[index]!) < 0.000001) ? 'none' : 'offer';
}

export function pointBounds(points: readonly [number, number][], city: BBox): BBox | null {
  const valid = points.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat) && lng >= city[0] && lng <= city[2] && lat >= city[1] && lat <= city[3]);
  if (!valid.length) return null;
  return [Math.min(...valid.map(point => point[0])), Math.min(...valid.map(point => point[1])), Math.max(...valid.map(point => point[0])), Math.max(...valid.map(point => point[1]))];
}
