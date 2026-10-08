/** Toạ độ GeoJSON [lng, lat]. */
export type Position = readonly [lng: number, lat: number];
/** Toạ độ của GeoJSON Polygon: vòng ngoài trước, các lỗ sau. */
export type PolygonRings = ReadonlyArray<ReadonlyArray<Position>>;
export interface ZoneShape<T> {
  ref: T;
  rings: PolygonRings;
}

/** Sai số khi xét điểm nằm trên cạnh, theo độ (khoảng 0,1 mm). */
const EPS = 1e-9;
/** Mét trên một độ vĩ (bán kính Trái Đất 6 371 km). */
const M_PER_DEG = 111_195;

/** Điểm nằm trên đoạn ab (tính cả hai đầu mút). */
function onSegment(p: Position, a: Position, b: Position): boolean {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  if (Math.abs(cross) > EPS) return false;
  return (
    p[0] >= Math.min(a[0], b[0]) - EPS &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    p[1] >= Math.min(a[1], b[1]) - EPS &&
    p[1] <= Math.max(a[1], b[1]) + EPS
  );
}

/** Vị trí của điểm so với một vòng kín (ray casting); điểm trên cạnh là 'boundary'. */
function ringPosition(p: Position, ring: ReadonlyArray<Position>): 'inside' | 'boundary' | 'outside' {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (onSegment(p, a, b)) return 'boundary';
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

/** Điểm thuộc polygon (vòng ngoài trừ các lỗ), tính cả điểm nằm trên cạnh. */
export function polygonContains(rings: PolygonRings, point: Position): boolean {
  const [outer, ...holes] = rings;
  if (!outer || ringPosition(point, outer) === 'outside') return false;
  return holes.every((hole) => ringPosition(point, hole) !== 'inside');
}

/** Khoảng cách (m) từ điểm tới cạnh gần nhất của polygon; chiếu phẳng theo vĩ độ của điểm, đủ chính xác ở quy mô thành phố. */
export function distanceToPolygonM(rings: PolygonRings, point: Position): number {
  const kx = M_PER_DEG * Math.cos((point[1] * Math.PI) / 180);
  const toXY = (q: Position): [number, number] => [(q[0] - point[0]) * kx, (q[1] - point[1]) * M_PER_DEG];
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = toXY(ring[i - 1]!);
      const [bx, by] = toXY(ring[i]!);
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      // Điểm đang xét là gốc toạ độ: chiếu gốc lên đoạn ab.
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/**
 * Gợi ý cụm khi ghim (decisions 2026-10-07): các cụm chứa điểm (điểm trên cạnh chung thì có cả hai, theo thứ tự đầu vào);
 * không cụm nào chứa thì cụm có cạnh gần nhất; chưa có cụm thì rỗng.
 */
export function suggestZones<T>(zones: readonly ZoneShape<T>[], point: Position): T[] {
  const containing = zones.filter((zone) => polygonContains(zone.rings, point));
  if (containing.length > 0) return containing.map((zone) => zone.ref);
  let nearest: ZoneShape<T> | undefined;
  let best = Infinity;
  for (const zone of zones) {
    const d = distanceToPolygonM(zone.rings, point);
    if (d < best) {
      best = d;
      nearest = zone;
    }
  }
  return nearest ? [nearest.ref] : [];
}
