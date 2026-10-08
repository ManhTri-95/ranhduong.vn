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

/**
 * Toạ độ sau khi bản đồ dừng di chuyển. Chưa ghim thì vẫn chưa ghim: phóng to, kéo để tìm chỗ không được tự đặt
 * toạ độ (chỉ nút "Ghim ở đây" hoặc dán toạ độ mới đặt). Đã ghim thì người dùng kéo bản đồ là dời ghim theo tâm;
 * bản đồ tự dịch (sau khi dán toạ độ) thì giữ nguyên.
 */
export function locationAfterMove(current: LngLat | null, center: LngLat, byUser: boolean): LngLat | null {
  if (current === null || !byUser) return current;
  return roundLngLat(center);
}
