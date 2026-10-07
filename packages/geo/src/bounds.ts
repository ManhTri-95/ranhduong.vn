/** Khung [tây, nam, đông, bắc] theo độ (lng, lat, lng, lat). */
export type Bounds = [west: number, south: number, east: number, north: number];

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Khung bao các điểm [lng, lat], nới thêm `marginDeg` độ mỗi phía; dùng làm maxBounds của bản đồ. */
export function boundsOf(points: ReadonlyArray<readonly [number, number]>, marginDeg = 0): Bounds {
  if (points.length === 0) throw new Error('boundsOf cần ít nhất một điểm');
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [round6(west - marginDeg), round6(south - marginDeg), round6(east + marginDeg), round6(north + marginDeg)];
}
