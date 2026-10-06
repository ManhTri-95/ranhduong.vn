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

/** Ước lượng phút di chuyển khi chưa có ma trận OSRM: chim bay × 1,4 ÷ 25 km/h (mục 7). */
export function estimateTravelMinutes(a: LatLng, b: LatLng, factor = 1.4, speedKmh = 25): number {
  const km = (haversineMeters(a, b) * factor) / 1000;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}
