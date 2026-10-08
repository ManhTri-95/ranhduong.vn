import type { BBox, LngLat } from '@ranhduong/contracts';

/** Nới khung [tây, nam, đông, bắc] thêm `marginDeg` độ mỗi phía. */
export function expandBBox([west, south, east, north]: BBox, marginDeg: number): BBox {
  return [west - marginDeg, south - marginDeg, east + marginDeg, north + marginDeg];
}

/** Điểm [lng, lat] nằm trong khung (tính cả cạnh). */
export function bboxContains([west, south, east, north]: BBox, [lng, lat]: LngLat): boolean {
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** Toạ độ để hiện và chép lại vào Sheet: "lat, lng", 6 chữ số thập phân. */
export function formatLatLng([lng, lat]: LngLat): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Làm tròn về 6 chữ số thập phân (khoảng 0,1 m) để toạ độ lưu gọn và so sánh ổn định. */
export function roundLngLat([lng, lat]: LngLat): LngLat {
  const round = (x: number) => Math.round(x * 1e6) / 1e6;
  return [round(lng), round(lat)];
}

/** Bản đồ vừa dịch vì: người dùng kéo; phóng to, thu nhỏ; hoặc code tự dịch (dán toạ độ). */
export type MoveGesture = 'drag' | 'zoom' | 'program';

/**
 * Toạ độ sau khi bản đồ dừng di chuyển. Chưa ghim thì vẫn chưa ghim: kéo, phóng to để tìm chỗ không được tự đặt
 * toạ độ (chỉ nút "Ghim ở đây" hoặc dán toạ độ mới đặt). Đã ghim thì chỉ khi người dùng kéo bản đồ mới dời ghim theo
 * tâm; phóng to, thu nhỏ không dời ghim, kể cả khi khung giới hạn (maxBounds) đẩy tâm bản đồ đi.
 */
export function locationAfterMove(current: LngLat | null, center: LngLat, gesture: MoveGesture): LngLat | null {
  if (current === null || gesture !== 'drag') return current;
  return roundLngLat(center);
}

/** Mức phóng to tối thiểu để ghim: đủ gần để thấy đường, nhà, tránh ghim nhầm ở mức nhìn cả thành phố. */
export const MIN_PIN_ZOOM = 15;

/** Nút "Ghim ở đây" chỉ dùng được khi bản đồ đã tải xong, không lỗi và đủ gần (không ghim vào tâm thành phố khi bản đồ trắng). */
export function canPinHere({ loaded, failed, zoom }: { loaded: boolean; failed: boolean; zoom: number }): boolean {
  return loaded && !failed && zoom >= MIN_PIN_ZOOM;
}
