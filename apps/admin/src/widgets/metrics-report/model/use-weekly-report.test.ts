import { WeeklyMetricsReport } from '@ranhduong/contracts';
import { FetchError } from 'ofetch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { fetchWeeklyMetrics } from '@/entities/metrics/api/metrics';
import { CITY_SLUG } from '@/shared/config';
import { useWeeklyReport } from './use-weekly-report';

vi.mock('@/entities/metrics/api/metrics', () => ({ fetchWeeklyMetrics: vi.fn() }));

// Báo cáo giả: mọi ngày cùng một số lượt chỉ đường để phân biệt tuần.
const report = (weekStart: string, directionClicks: number) => {
  const day = (offset: number) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
  return WeeklyMetricsReport.parse({
    weekStart, weekEnd: day(6), updatedAt: '2026-10-15T03:20:00.000Z',
    totals: { views: 0, directionClicks: directionClicks * 7, calls: 0, fanpageClicks: 0 },
    days: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ dayKey: day(i), counts: { views: 0, directionClicks, calls: 0, fanpageClicks: 0 } })),
    items: [],
  });
};
const httpError = (status: number) => {
  const error = new FetchError('Lỗi Giả Lập');
  Object.defineProperty(error, 'statusCode', { value: status });
  return error;
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount(week = ref('2026-10-12')) {
  const result = effectScope().run(() => useWeeklyReport(week));
  if (!result) throw new Error('không dựng được báo cáo');
  return { week, ...result };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useWeeklyReport', () => {
  it('tải tuần đang xem và tuần trước cùng lúc', async () => {
    vi.mocked(fetchWeeklyMetrics).mockImplementation(async (_city, week) => report(week ?? '', week === '2026-10-12' ? 5 : 3));
    const state = mount();
    await vi.waitFor(() => expect(state.state.value).toEqual({ kind: 'ready' }));
    expect(vi.mocked(fetchWeeklyMetrics).mock.calls).toEqual([[CITY_SLUG, '2026-10-12'], [CITY_SLUG, '2026-10-05']]);
    expect(state.report.value?.weekStart).toBe('2026-10-12');
    expect(state.previous.value?.weekStart).toBe('2026-10-05');
  });
  it('tuần trước lỗi: vẫn hiện báo cáo, chỉ bỏ phần so sánh', async () => {
    vi.mocked(fetchWeeklyMetrics).mockImplementation(async (_city, week) => {
      if (week === '2026-10-05') throw httpError(500);
      return report(week ?? '', 5);
    });
    const state = mount();
    await vi.waitFor(() => expect(state.state.value).toEqual({ kind: 'ready' }));
    expect(state.report.value?.weekStart).toBe('2026-10-12');
    expect(state.previous.value).toBeNull();
  });
  it('tuần đang xem lỗi: báo lỗi, hết phiên thì cần đăng nhập lại', async () => {
    vi.mocked(fetchWeeklyMetrics).mockRejectedValue(httpError(401));
    const expired = mount();
    await vi.waitFor(() => expect(expired.state.value).toEqual({ kind: 'error', login: true }));
    vi.mocked(fetchWeeklyMetrics).mockRejectedValue(httpError(503));
    const down = mount();
    await vi.waitFor(() => expect(down.state.value).toEqual({ kind: 'error', login: false }));
  });
  it('đổi tuần: bỏ số của tuần cũ ngay, kết quả tuần cũ về muộn không ghi đè tuần mới', async () => {
    let resolveOld: ((value: WeeklyMetricsReport) => void) | undefined;
    vi.mocked(fetchWeeklyMetrics).mockImplementation((_city, week) => {
      if (week === '2026-10-12') return new Promise((resolve) => (resolveOld = resolve));
      return Promise.resolve(report(week ?? '', 1));
    });
    const state = mount();
    state.week.value = '2026-09-28';
    await nextTick();
    expect(state.report.value).toBeNull();
    await vi.waitFor(() => expect(state.report.value?.weekStart).toBe('2026-09-28'));
    resolveOld?.(report('2026-10-12', 9));
    await settle();
    expect(state.report.value?.weekStart).toBe('2026-09-28');
  });
  it('Cập nhật: giữ số đang hiện trong lúc tải lại', async () => {
    vi.mocked(fetchWeeklyMetrics).mockImplementation(async (_city, week) => report(week ?? '', 5));
    const state = mount();
    await vi.waitFor(() => expect(state.state.value).toEqual({ kind: 'ready' }));
    let resolveFresh: ((value: WeeklyMetricsReport) => void) | undefined;
    vi.mocked(fetchWeeklyMetrics).mockImplementation((_city, week) =>
      week === '2026-10-12' ? new Promise((resolve) => (resolveFresh = resolve)) : Promise.resolve(report(week ?? '', 3)));
    const refreshing = state.refresh();
    expect(state.refreshing.value).toBe(true);
    expect(state.report.value?.days[0]?.counts.directionClicks).toBe(5);
    resolveFresh?.(report('2026-10-12', 6));
    await refreshing;
    expect(state.refreshing.value).toBe(false);
    expect(state.report.value?.days[0]?.counts.directionClicks).toBe(6);
  });
  it('Cập nhật lỗi mạng: giữ số đang hiện và báo chưa cập nhật được; hết phiên thì chuyển sang báo lỗi', async () => {
    vi.mocked(fetchWeeklyMetrics).mockImplementation(async (_city, week) => report(week ?? '', 5));
    const state = mount();
    await vi.waitFor(() => expect(state.state.value).toEqual({ kind: 'ready' }));
    vi.mocked(fetchWeeklyMetrics).mockRejectedValue(httpError(503));
    expect(await state.refresh()).toBe(false);
    expect(state.state.value).toEqual({ kind: 'ready' });
    expect(state.report.value?.weekStart).toBe('2026-10-12');
    vi.mocked(fetchWeeklyMetrics).mockRejectedValue(httpError(401));
    await state.refresh();
    expect(state.state.value).toEqual({ kind: 'error', login: true });
  });
});
