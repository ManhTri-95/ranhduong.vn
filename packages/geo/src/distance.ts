export interface LatLng { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Khoảng cách đường chim bay (mét). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Phút di chuyển chưa làm tròn (chim bay × 1,4 ÷ 25 km/h, mục 7): để so sánh tuyến và detour. */
export function estimateTravelMinutesExact(a: LatLng, b: LatLng, factor = 1.4, speedKmh = 25): number {
  return ((haversineMeters(a, b) * factor) / 1000 / speedKmh) * 60;
}

/** Ước lượng phút di chuyển khi chưa có ma trận OSRM: chim bay × 1,4 ÷ 25 km/h (mục 7). */
export function estimateTravelMinutes(a: LatLng, b: LatLng, factor = 1.4, speedKmh = 25): number {
  return Math.max(1, Math.round(estimateTravelMinutesExact(a, b, factor, speedKmh)));
}

/** Admin mẫu: công thức raw làm tròn tới 5 phút, không thêm đệm của bộ tối ưu lát 2. */
export function estimateTemplateTravelMinutes(a: LatLng, b: LatLng): number {
  return Math.round(estimateTravelMinutesExact(a, b) / 5) * 5;
}
