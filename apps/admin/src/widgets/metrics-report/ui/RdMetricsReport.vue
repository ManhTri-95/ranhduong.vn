<script setup lang="ts">
import { metricsDayKey, metricsWeekStart, shiftMetricDay, type MetricCounts } from '@ranhduong/contracts';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import { comparisonCaption, dayColumns, deltaText, formatCount, weekComparison, weekFromQuery, weekRangeLabel } from '../model/report';
import { useWeeklyReport } from '../model/use-weekly-report';
import RdMetricsDayChart from './RdMetricsDayChart.vue';
import RdMetricsPlaces from './RdMetricsPlaces.vue';

const route = useRoute();
const router = useRouter();
const todayKey = metricsDayKey(new Date());
const thisWeek = metricsWeekStart(todayKey);
const week = computed(() => weekFromQuery(route.query.week, todayKey));
const { report, previous, state, refreshing, refresh } = useWeeklyReport(week);
const refreshFailed = ref(false);
watch(week, () => { refreshFailed.value = false; });

const TILES: readonly { key: keyof MetricCounts; label: string }[] = [
  { key: 'directionClicks', label: 'Bấm chỉ đường' },
  { key: 'views', label: 'Lượt xem' },
  { key: 'calls', label: 'Gọi quán' },
  { key: 'fanpageClicks', label: 'Bấm fanpage' },
];
const columns = computed(() => (report.value ? dayColumns(report.value.days, todayKey) : []));
const comparison = computed(() => (report.value && previous.value ? weekComparison(report.value, previous.value, todayKey) : null));
const caption = computed(() => (comparison.value && previous.value ? comparisonCaption(comparison.value, previous.value) : ''));
const running = computed(() => week.value === thisWeek);
const updatedAt = computed(() => report.value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(report.value.updatedAt))
  : '');

/** Tuần đang chạy không ghi `?week=` để link /bao-cao luôn mở tuần hiện tại. */
function goWeek(start: string): void {
  void router.replace({ path: '/bao-cao', query: start === thisWeek ? {} : { week: start } });
}
function pickDate(event: Event): void {
  if (event.target instanceof HTMLInputElement && event.target.value) goWeek(weekFromQuery(event.target.value, todayKey));
}
async function onRefresh(): Promise<void> {
  refreshFailed.value = !(await refresh());
}
</script>

<template>
  <div class="rd-admin-page">
    <RdPageHeader title="Báo cáo địa điểm">
      <template #actions>
        <button type="button" class="rd-btn rd-btn--outline" :disabled="refreshing || state.kind === 'loading'" @click="onRefresh">{{ refreshing ? 'Đang cập nhật…' : 'Cập nhật' }}</button>
      </template>
      <template #meta>
        <span>Lượt xem và lượt bấm trên trang địa điểm, theo tuần thứ Hai – Chủ nhật.</span>
        <span v-if="report">Cập nhật lúc {{ updatedAt }}<template v-if="running"> · Số hôm nay vẫn đang đếm</template></span>
        <span v-if="refreshFailed && report && state.kind === 'ready'" role="status">Chưa cập nhật được, đang hiện số lần tải trước.</span>
      </template>
    </RdPageHeader>

    <div class="rd-metrics-week" role="group" aria-label="Chọn tuần">
      <div class="rd-metrics-week__nav">
      <button type="button" class="rd-icon-btn" aria-label="Tuần trước" @click="goWeek(shiftMetricDay(week, -7))">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <h2 class="rd-metrics-week__label" aria-live="polite">Tuần {{ weekRangeLabel(week, shiftMetricDay(week, 6)) }}</h2>
      <button type="button" class="rd-icon-btn" aria-label="Tuần sau" :disabled="week >= thisWeek" @click="goWeek(shiftMetricDay(week, 7))">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      </div>
      <button v-if="!running" type="button" class="rd-btn rd-btn--outline" @click="goWeek(thisWeek)">Tuần này</button>
      <label class="rd-metrics-week__pick">
        <span>Chọn ngày</span>
        <input class="rd-input" type="date" :value="week" :max="todayKey" @change="pickDate" />
      </label>
    </div>

    <RdSkeleton v-if="state.kind === 'loading'" :rows="3" variant="card" />
    <RdEmptyState v-else-if="state.kind === 'error'" kind="error" title="Chưa tải được báo cáo." :body="state.login ? 'Phiên đăng nhập đã hết.' : 'Kiểm tra mạng rồi thử lại nhé.'">
      <RouterLink v-if="state.login" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" :disabled="refreshing" @click="onRefresh">{{ refreshing ? 'Đang tải lại…' : 'Thử lại' }}</button>
    </RdEmptyState>
    <template v-else-if="report">
      <dl class="rd-metrics-tiles">
        <div v-for="tile in TILES" :key="tile.key" :class="['rd-metrics-tile', { 'rd-metrics-tile--hero': tile.key === 'directionClicks' }]">
          <dt>{{ tile.label }}</dt>
          <dd class="rd-metrics-tile__value">{{ formatCount(report.totals[tile.key]) }}</dd>
          <dd v-if="comparison" class="rd-metrics-tile__delta">{{ deltaText(comparison.metrics[tile.key].delta) }}<span class="rd-sr-only">. {{ caption }}</span></dd>
        </div>
      </dl>
      <p v-if="comparison" class="rd-quiet rd-metrics-caption">{{ caption }}</p>
      <RdMetricsDayChart :columns="columns" />
      <RdMetricsPlaces v-if="report.items.length" :items="report.items" />
      <RdEmptyState v-else kind="empty" title="Chưa có địa điểm công khai để báo cáo." body="Địa điểm nháp không vào báo cáo; kích hoạt địa điểm để bắt đầu đếm." />
      <p class="rd-quiet">Lượt xem được chống đếm trùng theo khách, địa điểm và ngày.</p>
    </template>
  </div>
</template>

<style scoped>
.rd-metrics-week { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rd-metrics-week__nav { display: flex; flex: 1 1 100%; align-items: center; gap: var(--space-2); min-width: 0; }
.rd-metrics-week__label { flex: 1; margin: 0; min-width: 0; font: 700 18px/1.3 var(--font-body); text-align: center; }
.rd-metrics-week__pick { display: flex; align-items: center; gap: var(--space-2); font-size: 14px; font-weight: 600; }
.rd-metrics-week__pick .rd-input { width: auto; }
@media (min-width: 768px) {
  .rd-metrics-week__nav { flex: 0 1 auto; }
  .rd-metrics-week__label { flex: 0 1 auto; }
  .rd-metrics-week__pick { margin-left: auto; }
}

.rd-metrics-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); margin: 0; }
.rd-metrics-tile { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; padding: var(--space-3); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.rd-metrics-tile dt { font-size: 13px; color: var(--ink-soft); }
.rd-metrics-tile dd { margin: 0; }
.rd-metrics-tile__value { font: 700 22px/1.2 var(--font-body); font-variant-numeric: tabular-nums; }
.rd-metrics-tile__delta { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.rd-metrics-tile--hero { grid-column: 1 / -1; border: var(--border-ink); }
.rd-metrics-tile--hero dt { font-size: 14px; font-weight: 600; color: var(--ink); }
.rd-metrics-tile--hero .rd-metrics-tile__value { font-size: 36px; }
.rd-metrics-caption { margin: calc(-1 * var(--space-2)) 0 0; }
@media (min-width: 1024px) {
  .rd-metrics-tiles { grid-template-columns: 2fr repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
  .rd-metrics-tile { padding: var(--space-4); }
  .rd-metrics-tile--hero { grid-column: auto; }
  .rd-metrics-tile__value { font-size: 28px; }
  .rd-metrics-tile--hero .rd-metrics-tile__value { font-size: 40px; }
}
</style>
