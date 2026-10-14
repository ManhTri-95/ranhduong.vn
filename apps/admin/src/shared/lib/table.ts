export type SortDir = 'asc' | 'desc';
export interface TableSort {
  key: string;
  dir: SortDir;
}
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** Chiều khi bấm cột lần đầu (cột "Cập nhật" xếp mới nhất trước). */
  firstDir?: SortDir;
  /** Độ rộng cố định (table-layout: fixed); cột không có thì chia phần còn lại. */
  width?: string;
  hideBelow?: 1024;
}
export type AriaSort = 'ascending' | 'descending' | 'none';
export const SORT_MARK: Record<AriaSort, string> = { ascending: '↑', descending: '↓', none: '' };

export function toggleSort(current: TableSort | null, column: Pick<TableColumn, 'key' | 'firstDir'>): TableSort {
  if (current && current.key === column.key) return { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key: column.key, dir: column.firstDir ?? 'asc' };
}

export function ariaSort(current: TableSort | null, key: string): AriaSort {
  if (!current || current.key !== key) return 'none';
  return current.dir === 'asc' ? 'ascending' : 'descending';
}

export function columnClass(column: Pick<TableColumn, 'hideBelow'>): string | undefined {
  return column.hideBelow ? `rd-admin-col--from-${column.hideBelow}` : undefined;
}
