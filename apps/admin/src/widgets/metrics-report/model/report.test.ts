import { describe, expect, it } from 'vitest';
import { comparisonCaption, dayColumns, deltaText, placeRows, weekComparison, weekFromQuery, weekRangeLabel } from './report';

// Hôm nay giả định: thứ Năm 15/10/2026, tuần đang chạy bắt đầu thứ Hai 12/10.
const TODAY = '2026-10-15';
const WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
/** 7 ngày với số lượt chỉ đường cho trước; các chỉ số khác giả lập theo công thức đơn giản. */
const days = (directions: number[]) =>
  WEEK.map((dayKey, i) => ({ dayKey, counts: { directionClicks: directions[i] ?? 0, views: (directions[i] ?? 0) * 10, calls: 1, fanpageClicks: 0 } }));

describe('weekFromQuery', () => {
  it('ngày đã qua: về thứ Hai của tuần chứa ngày đó', () => {
    expect(weekFromQuery('2026-10-08', TODAY)).toBe('2026-10-05');
  });
  it('ngày trong tuần đang chạy: về thứ Hai tuần này', () => {
    expect(weekFromQuery('2026-10-14', TODAY)).toBe('2026-10-12');
  });
  it('thiếu, sai định dạng, ngày không có thật hoặc ngày tương lai: về tuần đang chạy', () => {
    expect(weekFromQuery(undefined, TODAY)).toBe('2026-10-12');
    expect(weekFromQuery('tuan-gia-lap', TODAY)).toBe('2026-10-12');
    expect(weekFromQuery('2026-02-30', TODAY)).toBe('2026-10-12');
    expect(weekFromQuery('2026-10-16', TODAY)).toBe('2026-10-12');
    expect(weekFromQuery(['2026-10-08'], TODAY)).toBe('2026-10-12');
  });
});

describe('weekRangeLabel', () => {
  it('cùng năm: chỉ ghi năm ở ngày cuối', () => {
    expect(weekRangeLabel('2026-10-12', '2026-10-18')).toBe('12/10 – 18/10/2026');
  });
  it('tuần vắt qua năm mới: ghi năm ở cả hai đầu', () => {
    expect(weekRangeLabel('2025-12-29', '2026-01-04')).toBe('29/12/2025 – 04/01/2026');
  });
});

describe('dayColumns', () => {
  it('nhãn thứ và ngày, từ thứ Hai đến Chủ nhật', () => {
    const columns = dayColumns(days([14, 9, 22, 6, 0, 0, 0]), TODAY);
    expect(columns.map((c) => c.weekday)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    expect(columns.map((c) => c.date)).toEqual(['12/10', '13/10', '14/10', '15/10', '16/10', '17/10', '18/10']);
  });
  it('tuần đang chạy: hôm nay đang đếm, ngày sau hôm nay là chưa tới', () => {
    expect(dayColumns(days([14, 9, 22, 6, 0, 0, 0]), TODAY).map((c) => c.state)).toEqual(['past', 'past', 'past', 'today', 'future', 'future', 'future']);
  });
  it('tuần đã trọn: mọi ngày đã qua', () => {
    expect(dayColumns(days([1, 0, 0, 0, 0, 0, 2]), '2026-10-20').map((c) => c.state)).toEqual(Array(7).fill('past'));
  });
  it('chiều cao cột theo ngày nhiều nhất, làm tròn phần trăm', () => {
    expect(dayColumns(days([14, 9, 22, 6, 0, 0, 0]), TODAY).map((c) => c.heightPct)).toEqual([64, 41, 100, 27, 0, 0, 0]);
  });
  it('tuần chưa có lượt nào: cột cao 0, không chia cho 0', () => {
    expect(dayColumns(days([0, 0, 0, 0, 0, 0, 0]), TODAY).map((c) => c.heightPct)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

const PREV_WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
const current = { weekStart: '2026-10-12', weekEnd: '2026-10-18', days: days([14, 9, 22, 6, 0, 0, 0]) };
const previous = {
  weekStart: '2026-10-05',
  weekEnd: '2026-10-11',
  days: PREV_WEEK.map((dayKey) => ({ dayKey, counts: { directionClicks: 10, views: 100, calls: 1, fanpageClicks: 2 } })),
};

describe('weekComparison', () => {
  it('tuần đang chạy: so cùng kỳ từ thứ Hai tới hôm nay của tuần trước', () => {
    const result = weekComparison(current, previous, TODAY);
    expect(result.scope).toEqual({ kind: 'same-period', throughWeekday: 'T5' });
    expect(result.metrics.directionClicks).toEqual({ current: 51, previous: 40, delta: 11 });
    expect(result.metrics.views).toEqual({ current: 510, previous: 400, delta: 110 });
    expect(result.metrics.calls).toEqual({ current: 4, previous: 4, delta: 0 });
    expect(result.metrics.fanpageClicks).toEqual({ current: 0, previous: 8, delta: -8 });
  });
  it('tuần đã trọn: so cả tuần', () => {
    const result = weekComparison(current, previous, '2026-10-20');
    expect(result.scope).toEqual({ kind: 'full-week' });
    expect(result.metrics.directionClicks).toEqual({ current: 51, previous: 70, delta: -19 });
  });
});

describe('comparisonCaption', () => {
  it('cùng kỳ nhiều ngày, cùng kỳ một ngày, cả tuần', () => {
    expect(comparisonCaption(weekComparison(current, previous, TODAY), previous)).toBe('So với T2–T5 tuần trước');
    expect(comparisonCaption(weekComparison(current, previous, '2026-10-12'), previous)).toBe('So với T2 tuần trước');
    expect(comparisonCaption(weekComparison(current, previous, '2026-10-20'), previous)).toBe('So với tuần trước (05/10 – 11/10/2026)');
  });
});

describe('deltaText', () => {
  it('tăng có dấu cộng, giảm dùng dấu trừ, bằng nhau ghi không đổi', () => {
    expect(deltaText(11)).toBe('+11');
    expect(deltaText(-8)).toBe('−8');
    expect(deltaText(0)).toBe('Không đổi');
  });
});

// Địa điểm giả, tên rõ là giả; [chỉ đường, lượt xem, gọi quán, fanpage].
const item = (n: number, name: string, [directionClicks, views, calls, fanpageClicks]: [number, number, number, number]) => ({
  placeId: `0123456789abcdef0123000${n}`, slug: `gia-lap-${n}`, name, status: 'active' as const, counts: { directionClicks, views, calls, fanpageClicks },
});
const ITEMS = [
  item(1, 'Quán Giả Lập Một', [18, 120, 4, 3]),
  item(2, 'Cà Phê Giả Lập Hai', [3, 80, 0, 2]),
  item(3, 'Bánh Giả Lập Ba', [3, 9, 1, 0]),
  item(4, 'Quán Giả Lập Bốn', [0, 0, 0, 0]),
  item(5, 'Đồi Giả Lập Năm', [0, 31, 0, 0]),
  item(6, 'Ấp Giả Lập Sáu', [0, 0, 0, 0]),
];
const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe('placeRows', () => {
  it('mặc định: nhiều chỉ đường trước, bằng nhau thì theo tên; chỗ chưa có lượt nào gom riêng theo tên', () => {
    const rows = placeRows(ITEMS, { q: '', sort: { key: 'directionClicks', dir: 'desc' } });
    expect(names(rows.active)).toEqual(['Quán Giả Lập Một', 'Bánh Giả Lập Ba', 'Cà Phê Giả Lập Hai', 'Đồi Giả Lập Năm']);
    expect(names(rows.idle)).toEqual(['Ấp Giả Lập Sáu', 'Quán Giả Lập Bốn']);
  });
  it('xếp theo cột khác và theo tên tiếng Việt', () => {
    expect(names(placeRows(ITEMS, { q: '', sort: { key: 'views', dir: 'asc' } }).active)).toEqual(['Bánh Giả Lập Ba', 'Đồi Giả Lập Năm', 'Cà Phê Giả Lập Hai', 'Quán Giả Lập Một']);
    expect(names(placeRows(ITEMS, { q: '', sort: { key: 'name', dir: 'asc' } }).active)).toEqual(['Bánh Giả Lập Ba', 'Cà Phê Giả Lập Hai', 'Đồi Giả Lập Năm', 'Quán Giả Lập Một']);
  });
  it('tìm không dấu áp dụng cho cả nhóm chưa có lượt', () => {
    const rows = placeRows(ITEMS, { q: 'quan gia', sort: { key: 'directionClicks', dir: 'desc' } });
    expect(names(rows.active)).toEqual(['Quán Giả Lập Một']);
    expect(names(rows.idle)).toEqual(['Quán Giả Lập Bốn']);
  });
  it('thanh chỉ đường so với quán nhiều nhất của cả tuần, không đổi khi đang tìm', () => {
    expect(placeRows(ITEMS, { q: '', sort: { key: 'directionClicks', dir: 'desc' } }).active.map((row) => row.barPct)).toEqual([100, 17, 17, 0]);
    expect(placeRows(ITEMS, { q: 'ca phe', sort: { key: 'directionClicks', dir: 'desc' } }).active.map((row) => row.barPct)).toEqual([17]);
  });
});
