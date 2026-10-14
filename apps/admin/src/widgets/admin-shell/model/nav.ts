import type { RouteLocationRaw } from 'vue-router';
import type { ListKey } from '@/shared/lib/list-return';

export interface NavItem {
  label: string;
  path: string;
  /** Có thì link mở lại bộ lọc lần trước của danh sách đó. */
  list?: ListKey;
}
export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}
export interface NavLinkView extends NavItem {
  to: RouteLocationRaw;
}
export interface NavGroupView {
  label: string;
  items: NavLinkView[];
}

/** Menu theo tần suất dùng (spec S28 mục 5.1); Import CSV (S21) thêm vào "Nội dung" khi làm xong. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Nội dung',
    items: [
      { label: 'Địa điểm', path: '/dia-diem', list: 'places' },
      { label: 'Lịch trình mẫu', path: '/lich-trinh', list: 'templates' },
      { label: 'Danh sách gợi ý', path: '/danh-sach' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Báo cáo', path: '/bao-cao' },
      { label: 'Mùa & giao diện', path: '/mua' },
    ],
  },
];

/** Mục menu đang mở: trang con (/dia-diem/:id) vẫn thuộc mục cha. */
export function activeSection(path: string): string | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (path === item.path || path.startsWith(`${item.path}/`)) return item.path;
  }
  return null;
}

export interface RouteLike {
  path: string;
  params: Readonly<Record<string, string | string[]>>;
  matched: readonly object[];
}

/**
 * Việc khung trang làm sau mỗi lần chuyển route: đặt tên tab theo meta khi sang trang khác (cùng một form thì đầu
 * trang tự đặt), dời focus về tiêu đề khi đổi đường dẫn, trừ lần vào đầu và lúc vừa tạo xong (/moi thành /{id}).
 */
export function routeChangeEffects(to: RouteLike, from: RouteLike): { resetTitle: boolean; moveFocus: boolean } {
  if (from.matched.length === 0) return { resetTitle: true, moveFocus: false };
  const sameRecord = to.matched.at(-1) === from.matched.at(-1);
  const justCreated = sameRecord && from.params.id === 'moi';
  return { resetTitle: !sameRecord, moveFocus: to.path !== from.path && !justCreated };
}
