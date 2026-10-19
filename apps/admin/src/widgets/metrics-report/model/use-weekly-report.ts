import { shiftMetricDay, type WeeklyMetricsReport } from '@ranhduong/contracts';
import { ref, shallowRef, watch, type Ref } from 'vue';
import { fetchWeeklyMetrics } from '@/entities/metrics/api/metrics';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

export type ReportState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; login: boolean };

/**
 * Báo cáo tuần `week` (thứ Hai) kèm tuần trước để so sánh; hai request chạy song song.
 * Tuần trước lỗi thì chỉ bỏ phần so sánh. Đổi tuần thì bỏ số tuần cũ ngay; "Cập nhật" giữ số đang hiện tới khi có số mới.
 */
export function useWeeklyReport(week: Readonly<Ref<string>>) {
  const report = shallowRef<WeeklyMetricsReport | null>(null);
  const previous = shallowRef<WeeklyMetricsReport | null>(null);
  const state = ref<ReportState>({ kind: 'loading' });
  const refreshing = ref(false);
  /** Chỉ lần tải mới nhất được ghi kết quả (lần cũ về muộn thì bỏ). */
  let latest = 0;

  /** false khi chưa tải được tuần đang xem. `keep` (nút Cập nhật): lỗi không do hết phiên thì giữ số đang hiện. */
  async function load(keep = false): Promise<boolean> {
    const call = ++latest;
    const start = week.value;
    const [current, before] = await Promise.allSettled([fetchWeeklyMetrics(CITY_SLUG, start), fetchWeeklyMetrics(CITY_SLUG, shiftMetricDay(start, -7))]);
    if (call !== latest) return true;
    if (current.status === 'rejected') {
      const login = toApiFailure(current.reason).status === 401;
      const keepShown = keep && report.value !== null && !login;
      if (!keepShown) state.value = { kind: 'error', login };
      return false;
    }
    report.value = current.value;
    previous.value = before.status === 'fulfilled' ? before.value : null;
    state.value = { kind: 'ready' };
    return true;
  }

  async function refresh(): Promise<boolean> {
    refreshing.value = true;
    try { return await load(true); } finally { refreshing.value = false; }
  }

  watch(week, () => {
    report.value = null;
    previous.value = null;
    state.value = { kind: 'loading' };
    void load();
  }, { immediate: true });

  return { report, previous, state, refreshing, refresh };
}
