import { AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  filtersFromQuery,
  filtersToQuery,
  inTab,
  matchesFilters,
  NO_ZONE,
  sortRows,
  tabCounts,
  visibleRows,
  type ListFilters,
} from './filters';

// Dữ liệu giả, tên rõ là giả.
const NOW = new Date('2026-10-08T03:00:00Z');
let seq = 0;
function row(overrides: Partial<AdminPlaceSummary> = {}): AdminPlaceSummary {
  seq++;
  return AdminPlaceSummary.parse({
    id: seq.toString(16).padStart(24, '0'),
    status: 'active',
    slug: `quan-gia-lap-${seq}`,
    name: `Quán Giả Lập ${seq}`,
    aliases: [],
    category: 'cafe',
    alsoCategories: [],
    photoCount: 0,
    activationIssues: [],
    lastVerifiedAt: '2026-10-01T03:00:00.000Z',
    updatedAt: '2026-10-01T03:00:00.000Z',
    ...overrides,
  });
}
const filters = (overrides: Partial<ListFilters> = {}): ListFilters => ({ ...DEFAULT_FILTERS, ...overrides });
const names = (rows: readonly AdminPlaceSummary[]) => rows.map((r) => r.name);

describe('filtersFromQuery, filtersToQuery', () => {
  it('query trống: mặc định; đọc đủ các giá trị hợp lệ', () => {
    expect(filtersFromQuery({})).toEqual(DEFAULT_FILTERS);
    expect(
      filtersFromQuery({ status: 'stale', q: 'ca phe', zone: 'cum-gia-lap-a', category: 'food', verify: 'facebook', sort: '-name' }),
    ).toEqual({ tab: 'stale', q: 'ca phe', zone: 'cum-gia-lap-a', category: 'food', verify: 'facebook', sort: '-name' });
  });
  it('URL cũ hoặc bị sửa tay: giá trị lạ, null, tham số lặp thì lấy mặc định hoặc giá trị đầu', () => {
    expect(filtersFromQuery({ status: 'xoa', zone: 'Cụm A', category: 'bar', verify: 'ctv', sort: 'gia', q: null })).toEqual(DEFAULT_FILTERS);
    expect(filtersFromQuery({ status: ['draft', 'active'], zone: NO_ZONE })).toMatchObject({ tab: 'draft', zone: NO_ZONE });
    expect(filtersFromQuery({ q: 'a'.repeat(150) }).q).toHaveLength(100);
  });
  it('chỉ ghi giá trị khác mặc định, bỏ khoảng trắng thừa của từ khoá; đọc lại ra đúng bộ lọc', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toEqual({});
    const chosen = filters({ tab: 'draft', q: '  may  ', zone: NO_ZONE, category: 'attraction', verify: 'none', sort: 'name' });
    expect(filtersToQuery(chosen)).toEqual({ status: 'draft', q: 'may', zone: '_none', category: 'attraction', verify: 'none', sort: 'name' });
    expect(filtersFromQuery(filtersToQuery(chosen))).toEqual({ ...chosen, q: 'may' });
  });
});

describe('inTab', () => {
  it('"Cần xác minh lại" là chỗ đang hiển thị quá 90 ngày hoặc chưa xác minh, vẫn nằm trong "Đang hiển thị"', () => {
    const stale = row({ lastVerifiedAt: '2026-06-01T03:00:00.000Z' });
    const never = row({ lastVerifiedAt: undefined });
    const fresh = row();
    expect([stale, never, fresh].map((r) => inTab(r, 'stale', NOW))).toEqual([true, true, false]);
    expect([stale, never, fresh].map((r) => inTab(r, 'active', NOW))).toEqual([true, true, true]);
    expect(inTab(row({ status: 'draft', lastVerifiedAt: undefined }), 'stale', NOW)).toBe(false);
  });
  it('"Ẩn hoặc đã đóng" gồm đã ẩn và đã đóng cửa; "Tất cả" gồm mọi trạng thái', () => {
    expect(inTab(row({ status: 'hidden' }), 'inactive', NOW)).toBe(true);
    expect(inTab(row({ status: 'closed' }), 'inactive', NOW)).toBe(true);
    expect(inTab(row({ status: 'suspected' }), 'inactive', NOW)).toBe(false);
    expect(inTab(row({ status: 'closed' }), 'all', NOW)).toBe(true);
    expect(inTab(row({ status: 'draft' }), 'draft', NOW)).toBe(true);
  });
});

describe('matchesFilters', () => {
  it('tìm không dấu theo tên và tên khác', () => {
    const may = row({ name: 'Cà phê Giả Lập Mây', aliases: ['Tiệm Cũ Giả Lập'] });
    expect(matchesFilters(may, filters({ q: 'ca phe may' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'Mây' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'tiem cu' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'doi che' }))).toBe(false);
  });
  it('từ khoá chỉ có ký tự đặc biệt hoặc khoảng trắng: coi như không lọc', () => {
    const may = row({ name: 'Cà phê Giả Lập Mây' });
    expect(matchesFilters(may, filters({ q: '(((' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: '   ' }))).toBe(true);
  });
  it('cụm: đúng slug, hoặc "Chưa chọn cụm"', () => {
    const inA = row({ zone: 'cum-gia-lap-a' });
    const noZone = row();
    expect([inA, noZone].map((r) => matchesFilters(r, filters({ zone: 'cum-gia-lap-a' })))).toEqual([true, false]);
    expect([inA, noZone].map((r) => matchesFilters(r, filters({ zone: NO_ZONE })))).toEqual([false, true]);
    expect([inA, noZone].map((r) => matchesFilters(r, filters()))).toEqual([true, true]);
  });
  it('danh mục tính cả danh mục phụ (S27)', () => {
    const cafeFood = row({ category: 'cafe', alsoCategories: ['food'] });
    expect(matchesFilters(cafeFood, filters({ category: 'food' }))).toBe(true);
    expect(matchesFilters(cafeFood, filters({ category: 'cafe' }))).toBe(true);
    expect(matchesFilters(cafeFood, filters({ category: 'attraction' }))).toBe(false);
  });
  it('nguồn xác nhận: admin là "Chỉ dựa trên Facebook" với quán, "Điểm công cộng" với điểm tham quan', () => {
    const owner = row({ verifySource: 'owner' });
    const facebook = row({ verifySource: 'admin', category: 'cafe' });
    const publicSpot = row({ verifySource: 'admin', category: 'attraction' });
    const none = row();
    const all = [owner, facebook, publicSpot, none];
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'owner' })))).toEqual([true, false, false, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'facebook' })))).toEqual([false, true, false, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'public' })))).toEqual([false, false, true, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'none' })))).toEqual([false, false, false, true]);
  });
});

describe('tabCounts', () => {
  const rows = [
    row({ name: 'Nháp Giả Lập', status: 'draft', lastVerifiedAt: undefined }),
    row({ name: 'Mới Giả Lập' }),
    row({ name: 'Cũ Giả Lập', lastVerifiedAt: undefined }),
    row({ name: 'Nghi Giả Lập', status: 'suspected' }),
    row({ name: 'Ẩn Giả Lập', status: 'hidden' }),
    row({ name: 'Đóng Giả Lập', status: 'closed' }),
  ];
  it('đếm mọi tab; chỗ cần xác minh lại tính cả ở "Đang hiển thị"', () => {
    expect(tabCounts(rows, filters(), NOW)).toEqual({ all: 6, draft: 1, active: 2, suspected: 1, stale: 1, inactive: 2 });
  });
  it('đếm sau các bộ lọc khác (từ khoá, cụm…), không phụ thuộc tab đang chọn', () => {
    expect(tabCounts(rows, filters({ q: 'an gia lap', tab: 'draft' }), NOW)).toEqual({
      all: 1,
      draft: 0,
      active: 0,
      suspected: 0,
      stale: 0,
      inactive: 1,
    });
  });
});

describe('sortRows, visibleRows', () => {
  it('mặc định: sửa gần nhất trước', () => {
    const older = row({ name: 'Cũ Giả Lập', updatedAt: '2026-10-01T03:00:00.000Z' });
    const newer = row({ name: 'Mới Giả Lập', updatedAt: '2026-10-05T03:00:00.000Z' });
    expect(names(sortRows([older, newer], 'updated'))).toEqual(['Mới Giả Lập', 'Cũ Giả Lập']);
  });
  it('theo tên: thứ tự chữ cái tiếng Việt (Ấ trước B, Đ sau D); bấm lại thì ngược lại', () => {
    const rows = [row({ name: 'Đồi Giả Lập' }), row({ name: 'Bãi Giả Lập' }), row({ name: 'Ấp Giả Lập' }), row({ name: 'Dốc Giả Lập' })];
    expect(names(sortRows(rows, 'name'))).toEqual(['Ấp Giả Lập', 'Bãi Giả Lập', 'Dốc Giả Lập', 'Đồi Giả Lập']);
    expect(names(sortRows(rows, '-name'))).toEqual(['Đồi Giả Lập', 'Dốc Giả Lập', 'Bãi Giả Lập', 'Ấp Giả Lập']);
  });
  it('theo ngày xác minh: chưa xác minh và lâu nhất trước; ngược lại thì mới nhất trước, chưa xác minh cuối', () => {
    const never = row({ name: 'Chưa Giả Lập', lastVerifiedAt: undefined });
    const old = row({ name: 'Lâu Giả Lập', lastVerifiedAt: '2026-05-01T03:00:00.000Z' });
    const recent = row({ name: 'Gần Giả Lập', lastVerifiedAt: '2026-10-07T03:00:00.000Z' });
    expect(names(sortRows([recent, never, old], 'verified'))).toEqual(['Chưa Giả Lập', 'Lâu Giả Lập', 'Gần Giả Lập']);
    expect(names(sortRows([old, never, recent], '-verified'))).toEqual(['Gần Giả Lập', 'Lâu Giả Lập', 'Chưa Giả Lập']);
  });
  it('visibleRows: lọc theo tab và bộ lọc rồi xếp; không đổi mảng gốc', () => {
    const rows = [row({ name: 'Bãi Giả Lập', status: 'draft' }), row({ name: 'Ấp Giả Lập', status: 'draft' }), row({ name: 'Cầu Giả Lập' })];
    expect(names(visibleRows(rows, filters({ tab: 'draft', sort: 'name' }), NOW))).toEqual(['Ấp Giả Lập', 'Bãi Giả Lập']);
    expect(names(rows)).toEqual(['Bãi Giả Lập', 'Ấp Giả Lập', 'Cầu Giả Lập']);
  });
});
