import { MetricDayKey, metricsWeekStart, type MetricCounts, type WeeklyMetricsReport } from '@ranhduong/contracts';
import { matchScore } from '@ranhduong/geo';
import type { TableSort } from '@/shared/lib/table';

/** Thứ Hai của tuần cần xem từ `?week=`; thiếu, sai hoặc ngày tương lai thì lấy tuần đang chạy (API từ chối tuần tương lai). */
export function weekFromQuery(value: unknown, todayKey: string): string {
  const day = typeof value === 'string' && MetricDayKey.safeParse(value).success && value <= todayKey ? value : todayKey;
  return metricsWeekStart(day);
}

const dayMonth = (dayKey: string) => `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}`;

/** "12/10 – 18/10/2026"; tuần vắt qua năm mới ghi năm ở cả hai đầu. */
export function weekRangeLabel(start: string, end: string): string {
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  return `${dayMonth(start)}${startYear === endYear ? '' : `/${startYear}`} – ${dayMonth(end)}/${endYear}`;
}

/** past: đã trọn ngày; today: đang đếm; future: chưa tới (số 0 không có nghĩa là không ai bấm). */
export type DayState = 'past' | 'today' | 'future';
export interface DayColumn {
  dayKey: string;
  weekday: string;
  date: string;
  state: DayState;
  counts: MetricCounts;
  /** Chiều cao cột chỉ đường, phần trăm so với ngày nhiều nhất. */
  heightPct: number;
}

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const weekdayOf = (dayKey: string) => WEEKDAY[new Date(`${dayKey}T00:00:00Z`).getUTCDay()] ?? '';

export function dayColumns(days: WeeklyMetricsReport['days'], todayKey: string): DayColumn[] {
  const max = Math.max(0, ...days.filter((day) => day.dayKey <= todayKey).map((day) => day.counts.directionClicks));
  return days.map(({ dayKey, counts }) => ({
    dayKey,
    weekday: weekdayOf(dayKey),
    date: dayMonth(dayKey),
    state: dayKey < todayKey ? 'past' : dayKey === todayKey ? 'today' : 'future',
    counts,
    heightPct: max > 0 && dayKey <= todayKey ? Math.round((counts.directionClicks / max) * 100) : 0,
  }));
}

type WeekDays = Pick<WeeklyMetricsReport, 'weekStart' | 'weekEnd' | 'days'>;
export interface MetricChange {
  current: number;
  previous: number;
  delta: number;
}
export interface WeekComparison {
  /** same-period: tuần đang chạy, so từ thứ Hai tới hôm nay; full-week: hai tuần đã trọn. */
  scope: { kind: 'same-period'; throughWeekday: string } | { kind: 'full-week' };
  metrics: Record<keyof MetricCounts, MetricChange>;
}

const sumDays = (days: WeeklyMetricsReport['days'], count: number, field: keyof MetricCounts) =>
  days.slice(0, count).reduce((sum, day) => sum + day.counts[field], 0);

/** So với tuần trước; tuần đang chạy thì chỉ cộng cùng số ngày ở cả hai tuần để không so nửa tuần với cả tuần. */
export function weekComparison(current: WeekDays, previous: WeekDays, todayKey: string): WeekComparison {
  const running = todayKey >= current.weekStart && todayKey <= current.weekEnd;
  const count = running ? current.days.findIndex((day) => day.dayKey === todayKey) + 1 : 7;
  const change = (field: keyof MetricCounts): MetricChange => {
    const now = sumDays(current.days, count, field);
    const before = sumDays(previous.days, count, field);
    return { current: now, previous: before, delta: now - before };
  };
  const metrics = { views: change('views'), directionClicks: change('directionClicks'), calls: change('calls'), fanpageClicks: change('fanpageClicks') };
  const scope: WeekComparison['scope'] = running ? { kind: 'same-period', throughWeekday: weekdayOf(todayKey) } : { kind: 'full-week' };
  return { scope, metrics };
}

export function comparisonCaption(comparison: WeekComparison, previous: Pick<WeeklyMetricsReport, 'weekStart' | 'weekEnd'>): string {
  if (comparison.scope.kind === 'full-week') return `So với tuần trước (${weekRangeLabel(previous.weekStart, previous.weekEnd)})`;
  const through = comparison.scope.throughWeekday;
  return `So với ${through === 'T2' ? 'T2' : `T2–${through}`} tuần trước`;
}

/** Chênh lệch dạng "+11", "−8" (dấu trừ U+2212), bằng nhau thì "Không đổi". */
export function deltaText(delta: number): string {
  if (delta === 0) return 'Không đổi';
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

export type PlaceItem = WeeklyMetricsReport['items'][number];
export type PlaceRow = PlaceItem & { barPct: number };
/** Bảng theo địa điểm mặc định xếp nhiều lượt chỉ đường trước. */
export const DEFAULT_PLACE_SORT: TableSort = { key: 'directionClicks', dir: 'desc' };

const byName = (a: PlaceItem, b: PlaceItem) => a.name.localeCompare(b.name, 'vi');
const isSortKey = (key: string): key is keyof MetricCounts => key === 'views' || key === 'directionClicks' || key === 'calls' || key === 'fanpageClicks';
const isIdle = (item: PlaceItem) => !item.counts.views && !item.counts.directionClicks && !item.counts.calls && !item.counts.fanpageClicks;

/**
 * Bảng theo địa điểm: `active` có ít nhất một lượt, xếp theo cột đang chọn (bằng nhau thì theo tên);
 * `idle` là chỗ cả tuần chưa có lượt nào, theo tên. Tìm không dấu áp dụng cho cả hai.
 * Thanh chỉ đường so với quán nhiều nhất cả tuần nên không đổi khi đang tìm.
 */
export function placeRows(items: readonly PlaceItem[], options: { q: string; sort: TableSort }): { active: PlaceRow[]; idle: PlaceRow[] } {
  const max = Math.max(0, ...items.map((item) => item.counts.directionClicks));
  const rows = items
    .filter((item) => !options.q.trim() || matchScore(options.q, item.name) > 0)
    .map((item) => ({ ...item, barPct: max > 0 ? Math.round((item.counts.directionClicks / max) * 100) : 0 }));
  const { key, dir } = options.sort;
  const sign = dir === 'asc' ? 1 : -1;
  const compare = (a: PlaceItem, b: PlaceItem) => (isSortKey(key) ? sign * (a.counts[key] - b.counts[key]) || byName(a, b) : sign * byName(a, b));
  return { active: rows.filter((row) => !isIdle(row)).sort(compare), idle: rows.filter(isIdle).sort(byName) };
}

const countFormat = new Intl.NumberFormat('vi-VN');
/** Số đếm kiểu Việt Nam: 1.234. */
export const formatCount = (value: number) => countFormat.format(value);
