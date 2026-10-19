import { PlaceCategory, servesCategory, Slug, verificationStale, type AdminPlaceSummary } from '@ranhduong/contracts';
import { matchScore, searchKey } from '@ranhduong/geo';
import { z } from 'zod';
import { itineraryReminders, ItineraryReminder } from '@/entities/place/model/itinerary-reminders';
import type { TableSort } from '@/shared/lib/table';

/** Tab trạng thái (ui-spec mục 12) và tab "Ẩn hoặc đã đóng" thêm ở S07 để tìm lại chỗ đã ẩn, đã đóng. */
export const ListTab = z.enum(['all', 'draft', 'active', 'suspected', 'stale', 'inactive']);
export type ListTab = z.infer<typeof ListTab>;
export const LIST_TABS: readonly { value: ListTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'active', label: 'Đang hiển thị' },
  { value: 'suspected', label: 'Bị nghi ngờ' },
  { value: 'stale', label: 'Cần xác minh lại' },
  { value: 'inactive', label: 'Ẩn hoặc đã đóng' },
];

/** Lọc nguồn xác nhận như cột "Xác nhận": quán xác nhận, chỉ dựa trên Facebook, điểm công cộng, chưa chọn. */
export const VerifyFilter = z.enum(['owner', 'facebook', 'public', 'none']);
export type VerifyFilter = z.infer<typeof VerifyFilter>;
export const VERIFY_FILTERS: readonly { value: VerifyFilter; label: string }[] = [
  { value: 'owner', label: 'Quán xác nhận' },
  { value: 'facebook', label: 'Chỉ dựa trên Facebook' },
  { value: 'public', label: 'Điểm công cộng' },
  { value: 'none', label: 'Chưa chọn' },
];

/** updated: sửa gần nhất trước; -updated: sửa lâu nhất trước; name: A→Z; verified: chưa xác minh và lâu nhất trước; dấu trừ là chiều ngược lại. */
export const ListSort = z.enum(['updated', '-updated', 'name', '-name', 'verified', '-verified']);
export type ListSort = z.infer<typeof ListSort>;

/** Giá trị lọc cụm cho chỗ chưa chọn cụm; không phải slug hợp lệ nên không trùng cụm nào. */
export const NO_ZONE = '_none';
const MAX_QUERY_LENGTH = 100;

export interface ListFilters {
  tab: ListTab;
  /** Từ khoá tìm theo tên và tên khác, không dấu. */
  q: string;
  /** '' mọi cụm, NO_ZONE chưa chọn cụm, còn lại là slug cụm. */
  zone: string;
  category: PlaceCategory | '';
  verify: VerifyFilter | '';
  reminder: ItineraryReminder | '';
  sort: ListSort;
}

export const DEFAULT_FILTERS: ListFilters = { tab: 'all', q: '', zone: '', category: '', verify: '', reminder: '', sort: 'updated' };

/** Giá trị đầu của một tham số query (vue-router trả chuỗi, null hoặc mảng). */
function firstValue(value: unknown): string | undefined {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : undefined;
}

/** Bộ lọc từ query của URL (giữ khi quay lại từ form); giá trị lạ hoặc thiếu thì lấy mặc định. */
export function filtersFromQuery(query: Readonly<Record<string, unknown>>): ListFilters {
  const read = (key: string) => firstValue(query[key]);
  const zone = read('zone') ?? '';
  return {
    tab: ListTab.catch(DEFAULT_FILTERS.tab).parse(read('status')),
    q: (read('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    zone: zone === NO_ZONE || Slug.safeParse(zone).success ? zone : '',
    category: PlaceCategory.or(z.literal('')).catch('').parse(read('category')),
    verify: VerifyFilter.or(z.literal('')).catch('').parse(read('verify')),
    reminder: ItineraryReminder.or(z.literal('')).catch('').parse(read('reminder')),
    sort: ListSort.catch(DEFAULT_FILTERS.sort).parse(read('sort')),
  };
}

/**
 * Cụm trong URL không còn trong thành phố (slug cũ sau khi đổi ranh giới cụm) thì về "Mọi cụm", để link cũ không ra
 * danh sách trống. Gọi khi đã tải xong các cụm.
 */
export function withKnownZone(filters: ListFilters, zoneSlugs: readonly string[]): ListFilters {
  if (filters.zone === '' || filters.zone === NO_ZONE || zoneSlugs.includes(filters.zone)) return filters;
  return { ...filters, zone: '' };
}

/** Ngược lại của filtersFromQuery: chỉ ghi giá trị khác mặc định để URL ngắn. */
export function filtersToQuery(filters: ListFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.tab !== DEFAULT_FILTERS.tab) query.status = filters.tab;
  const q = filters.q.trim();
  if (q) query.q = q;
  if (filters.zone) query.zone = filters.zone;
  if (filters.category) query.category = filters.category;
  if (filters.verify) query.verify = filters.verify;
  if (filters.reminder) query.reminder = filters.reminder;
  if (filters.sort !== DEFAULT_FILTERS.sort) query.sort = filters.sort;
  return query;
}

/** Địa điểm có thuộc tab không. "Cần xác minh lại" là chỗ đang hiển thị quá 90 ngày chưa xác minh (cũng thuộc "Đang hiển thị"). */
export function inTab(row: AdminPlaceSummary, tab: ListTab, now: Date): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'stale':
      return row.status === 'active' && verificationStale(row.lastVerifiedAt, now);
    case 'inactive':
      return row.status === 'hidden' || row.status === 'closed';
    default:
      return row.status === tab;
  }
}

function matchesVerify(row: AdminPlaceSummary, verify: VerifyFilter): boolean {
  switch (verify) {
    case 'owner':
      return row.verifySource === 'owner';
    case 'facebook':
      return row.verifySource === 'admin' && row.category !== 'attraction';
    case 'public':
      return row.verifySource === 'admin' && row.category === 'attraction';
    case 'none':
      return row.verifySource === undefined;
  }
}

/**
 * Các bộ lọc trừ tab: từ khoá (tên, tên khác, không dấu; chỉ có ký tự đặc biệt thì coi như không có), cụm,
 * danh mục (chính hoặc phụ), nguồn xác nhận, nhắc dữ liệu lịch trình.
 */
export function matchesFilters(row: AdminPlaceSummary, filters: ListFilters, now: Date = new Date()): boolean {
  if (searchKey(filters.q) && matchScore(filters.q, row.name, row.aliases) === 0) return false;
  if (filters.zone === NO_ZONE ? row.zone !== undefined : filters.zone !== '' && row.zone !== filters.zone) return false;
  if (filters.category && !servesCategory(row, filters.category)) return false;
  if (filters.verify && !matchesVerify(row, filters.verify)) return false;
  if (filters.reminder && !itineraryReminders(row, now).includes(filters.reminder)) return false;
  return true;
}

/** Số địa điểm mỗi tab, sau các bộ lọc khác (không phụ thuộc tab đang chọn). */
export function tabCounts(rows: readonly AdminPlaceSummary[], filters: ListFilters, now: Date): Record<ListTab, number> {
  const counts: Record<ListTab, number> = { all: 0, draft: 0, active: 0, suspected: 0, stale: 0, inactive: 0 };
  for (const row of rows) {
    if (!matchesFilters(row, filters, now)) continue;
    for (const tab of ListTab.options) if (inTab(row, tab, now)) counts[tab]++;
  }
  return counts;
}

type Compare = (a: AdminPlaceSummary, b: AdminPlaceSummary) => number;
const collator = new Intl.Collator('vi');
const byName: Compare = (a, b) => collator.compare(a.name, b.name);
/** Chưa xác minh tính là xa nhất. */
const verifiedTime = (row: AdminPlaceSummary) => (row.lastVerifiedAt ? Date.parse(row.lastVerifiedAt) : -Infinity);
const COMPARE: Record<ListSort, Compare> = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || byName(a, b),
  '-updated': (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt) || byName(a, b),
  name: byName,
  '-name': (a, b) => byName(b, a),
  // -Infinity trừ -Infinity ra NaN (falsy) nên hai chỗ chưa xác minh xếp theo tên.
  verified: (a, b) => verifiedTime(a) - verifiedTime(b) || byName(a, b),
  '-verified': (a, b) => verifiedTime(b) - verifiedTime(a) || byName(a, b),
};

/** Bản đã xếp (không đổi mảng gốc). */
export function sortRows(rows: readonly AdminPlaceSummary[], sort: ListSort): AdminPlaceSummary[] {
  return [...rows].sort(COMPARE[sort]);
}

/** Các dòng hiện ra: thuộc tab, khớp bộ lọc, đã xếp. */
export function visibleRows(rows: readonly AdminPlaceSummary[], filters: ListFilters, now: Date): AdminPlaceSummary[] {
  return sortRows(
    rows.filter((row) => inTab(row, filters.tab, now) && matchesFilters(row, filters, now)),
    filters.sort,
  );
}

/** Ô "Xếp" (spec S28 mục 6.2); nhãn hiện sau chữ "Xếp: ". */
export const SORT_OPTIONS: readonly { value: ListSort; label: string }[] = [
  { value: 'updated', label: 'Mới sửa' },
  { value: '-updated', label: 'Lâu chưa sửa' },
  { value: 'name', label: 'Tên A→Z' },
  { value: '-name', label: 'Tên Z→A' },
  { value: 'verified', label: 'Lâu chưa xác minh' },
  { value: '-verified', label: 'Mới xác minh' },
];

/** Cách xếp ↔ cột bảng; chiều là chiều thật của giá trị trong cột (mới sửa trước là giảm dần theo thời gian). */
const SORT_TABLE: Record<ListSort, TableSort> = {
  updated: { key: 'updated', dir: 'desc' },
  '-updated': { key: 'updated', dir: 'asc' },
  name: { key: 'name', dir: 'asc' },
  '-name': { key: 'name', dir: 'desc' },
  verified: { key: 'verified', dir: 'asc' },
  '-verified': { key: 'verified', dir: 'desc' },
};

export function sortToTable(sort: ListSort): TableSort {
  return SORT_TABLE[sort];
}

/** Cột không xếp được hoặc lạ thì về mặc định "Mới sửa". */
export function tableToSort(table: TableSort | null): ListSort {
  if (!table) return DEFAULT_FILTERS.sort;
  return ListSort.options.find((sort) => SORT_TABLE[sort].key === table.key && SORT_TABLE[sort].dir === table.dir) ?? DEFAULT_FILTERS.sort;
}

/** Có lọc gì ngoài tab và cách xếp không (hiện nút "Xoá bộ lọc"). */
export function hasActiveFilters(filters: ListFilters): boolean {
  return filters.q.trim() !== '' || filters.zone !== '' || filters.category !== '' || filters.verify !== '' || filters.reminder !== '';
}

/** "Xoá bộ lọc": bỏ từ khoá, cụm, danh mục, nguồn và nhắc; giữ tab và cách xếp. */
export function clearFilters(filters: ListFilters): ListFilters {
  return { ...filters, q: '', zone: '', category: '', verify: '', reminder: '' };
}
