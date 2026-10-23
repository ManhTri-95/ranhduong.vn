/** Ba mức của bottom sheet bản đồ trên điện thoại (ui-spec mục 4): thu gọn, nửa màn hình, mở rộng. */
export type SheetSnap = 'collapsed' | 'half' | 'expanded';
export type SheetHeights = Record<SheetSnap, number>;

/** Khoảng chừa giữa header và sheet khi mở rộng, đủ cho dòng ghi nguồn OSM luôn thấy (ui-spec mục 6). */
const EXPANDED_GAP = 40;
/** Vuốt nhanh hơn ngưỡng này (px/ms) thì sang mức kế tiếp thay vì về mức gần nhất. */
const FLICK_VELOCITY = 0.4;
const OVERDRAG = 0.3;
const ORDER: SheetSnap[] = ['collapsed', 'half', 'expanded'];

/** Chiều cao nhìn thấy của sheet ở từng mức; `peek` là phần đầu sheet (thanh kéo và tiêu đề). */
export function sheetHeights(viewport: number, headerBottom: number, peek: number, gap = EXPANDED_GAP): SheetHeights {
  const expanded = Math.max(peek, viewport - headerBottom - gap);
  const half = Math.min(Math.max(Math.round(viewport * 0.5), peek), expanded);
  return { collapsed: Math.min(peek, expanded), half, expanded };
}

/** Mức sheet dừng lại khi thả tay; `velocity` dương là đang kéo lên (sheet cao thêm). */
export function settleSnap(visible: number, velocity: number, heights: SheetHeights): SheetSnap {
  if (Math.abs(velocity) >= FLICK_VELOCITY) {
    const ahead = velocity > 0
      ? ORDER.find((snap) => heights[snap] > visible + 1)
      : [...ORDER].reverse().find((snap) => heights[snap] < visible - 1);
    return ahead ?? (velocity > 0 ? 'expanded' : 'collapsed');
  }
  return ORDER.reduce((best, snap) => (Math.abs(heights[snap] - visible) < Math.abs(heights[best] - visible) ? snap : best));
}

/** Kéo quá mức cao nhất hoặc thấp nhất thì sheet chỉ nhích thêm một phần, cho cảm giác có lực cản. */
export function resistDrag(visible: number, heights: SheetHeights): number {
  if (visible > heights.expanded) return heights.expanded + (visible - heights.expanded) * OVERDRAG;
  if (visible < heights.collapsed) return heights.collapsed - (heights.collapsed - visible) * OVERDRAG;
  return visible;
}
