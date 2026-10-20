import type { GeoPoint } from '@ranhduong/contracts';
import { estimateTravelMinutesExact } from '@ranhduong/geo';
import { EPS } from './scoring';

/** Điểm cần sắp: ghim 'first' (bình minh) luôn đầu ngày, 'last' (buổi tối) luôn cuối ngày. */
export interface RouteStop {
  location: GeoPoint;
  pin?: 'first' | 'last';
}

/** Phút giữa hai điểm, dùng để so sánh tuyến (không dùng để xếp giờ). */
export type RouteCost = (a: GeoPoint, b: GeoPoint) => number;

const latLng = (point: GeoPoint) => ({ lng: point.coordinates[0], lat: point.coordinates[1] });

/** Ước lượng chim bay chưa làm tròn (technical-design mục 7) cho tới khi có ma trận OSRM (S44). */
export const exactTravel: RouteCost = (a, b) => estimateTravelMinutesExact(latLng(a), latLng(b));

/** Tổng phút các chặng; có nơi ở thì tuyến khép kín: nơi ở → điểm đầu … điểm cuối → nơi ở. */
export function routeCost(order: readonly RouteStop[], cost: RouteCost, stay?: GeoPoint): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += cost(order[i - 1]!.location, order[i]!.location);
  const first = order[0];
  const last = order.at(-1);
  if (stay && first && last) total += cost(stay, first.location) + cost(last.location, stay);
  return total;
}

/** Nearest neighbor từ `from` (không có thì từ điểm đầu danh sách); hoà trong EPS thì lấy điểm đứng trước. */
function nearestNeighbor<T extends RouteStop>(stops: readonly T[], cost: RouteCost, from?: GeoPoint): T[] {
  const left = [...stops];
  const order: T[] = [];
  let current = from;
  while (left.length > 0) {
    let best = 0;
    if (current) {
      let bestCost = Infinity;
      left.forEach((stop, i) => {
        const c = cost(current!, stop.location);
        if (c < bestCost - EPS) {
          best = i;
          bestCost = c;
        }
      });
    }
    const [next] = left.splice(best, 1);
    order.push(next!);
    current = next!.location;
  }
  return order;
}

/**
 * Sắp thứ tự một ngày (technical-design mục 7 bước 7): nearest neighbor từ ghim đầu hoặc nơi ở (không có thì tuyến mở
 * từ điểm đầu danh sách), rồi 2-opt trên các điểm không ghim, cải thiện đầu tiên, chỉ nhận khi giảm hơn EPS.
 */
export function routeDay<T extends RouteStop>(stops: readonly T[], cost: RouteCost, stay?: GeoPoint): T[] {
  const first = stops.find((stop) => stop.pin === 'first');
  const last = stops.find((stop) => stop.pin === 'last');
  const middle = nearestNeighbor(stops.filter((stop) => !stop.pin), cost, first?.location ?? stay);
  const assemble = (inner: readonly T[]) => [...(first ? [first] : []), ...inner, ...(last ? [last] : [])];
  let route = middle;
  let best = routeCost(assemble(route), cost, stay);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1 && !improved; i++) {
      for (let j = i + 1; j < route.length && !improved; j++) {
        const flipped = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        const total = routeCost(assemble(flipped), cost, stay);
        if (total < best - EPS) {
          route = flipped;
          best = total;
          improved = true;
        }
      }
    }
  }
  return assemble(route);
}

/** Đảo các điểm không ghim, giữ ghim đầu/cuối (ngày mưa so hai chiều đi). */
export function reversedMiddle<T extends RouteStop>(order: readonly T[]): T[] {
  const first = order[0]?.pin === 'first' ? 1 : 0;
  const last = order.at(-1)?.pin === 'last' ? order.length - 1 : order.length;
  return [...order.slice(0, first), ...order.slice(first, last).reverse(), ...order.slice(last)];
}
