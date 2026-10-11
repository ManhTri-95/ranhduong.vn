<script setup lang="ts">
import { metricsDayKey, metricsWeekStart, shiftMetricDay, type WeeklyMetricsReport } from '@ranhduong/contracts';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { fetchWeeklyMetrics } from '@/entities/metrics/api/metrics';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

const route = useRoute(); const router = useRouter();
const today = metricsWeekStart(metricsDayKey(new Date()));
const report = ref<WeeklyMetricsReport | null>(null);
const selected = ref(today); const loading = ref(false); const failed = ref(false); const loginRequired = ref(false);
let generation = 0;
const week = computed(() => typeof route.query.week === 'string' ? route.query.week : today);
const maxDirections = computed(() => Math.max(...(report.value?.days.map(day => day.counts.directionClicks) ?? []), 1));
const dateLabel = (day: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${day}T00:00:00+07:00`));
async function load(): Promise<void> {
  const current = ++generation; loading.value = true; failed.value = false; loginRequired.value = false;
  try { const result = await fetchWeeklyMetrics(CITY_SLUG, week.value); if (current === generation) { report.value = result; selected.value = result.weekStart; } }
  catch (error) { if (current === generation) { failed.value = true; loginRequired.value = toApiFailure(error).status === 401; } }
  finally { if (current === generation) loading.value = false; }
}
async function choose(value: string): Promise<void> { await router.replace({ path: '/bao-cao', query: { week: value } }); }
watch(week, () => { report.value = null; void load(); }, { immediate: true });
</script>
<template>
  <div class="rd-metrics">
    <header><h1>Báo cáo địa điểm</h1><p>Lượt bấm chỉ đường theo tuần, từ thứ Hai đến Chủ nhật. Số liệu hôm nay được cập nhật từ bộ đếm đang chạy.</p></header>
    <form class="rd-metrics__filters" @submit.prevent="choose(selected)">
      <label class="rd-field">Chọn ngày trong tuần<input v-model="selected" type="date" :max="metricsDayKey(new Date())" required></label><button class="rd-btn rd-btn--primary" type="submit">Xem tuần</button>
      <template v-if="report"><button class="rd-btn rd-btn--outline" type="button" @click="choose(shiftMetricDay(report.weekStart, -7))">← Tuần trước</button><button class="rd-btn rd-btn--outline" type="button" :disabled="report.weekStart >= today" @click="choose(shiftMetricDay(report.weekStart, 7))">Tuần sau →</button></template>
      <button class="rd-btn rd-btn--outline" type="button" :disabled="loading" @click="load">Cập nhật</button>
    </form>
    <p v-if="loading" role="status">Đang tải báo cáo…</p>
    <section v-else-if="failed" class="rd-callout rd-callout--bad" role="alert"><p>Chưa tải được báo cáo. Kiểm tra tuần đã chọn và thử lại nhé.</p><button class="rd-btn rd-btn--outline" type="button" @click="load">Thử lại</button><RouterLink v-if="loginRequired" class="rd-metrics__link" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink></section>
    <template v-else-if="report">
      <h2>{{ dateLabel(report.weekStart) }} – {{ dateLabel(report.weekEnd) }}</h2>
      <dl class="rd-metrics__totals"><div><dt>Bấm chỉ đường</dt><dd>{{ report.totals.directionClicks }}</dd></div><div><dt>Lượt xem địa điểm</dt><dd>{{ report.totals.views }}</dd></div><div><dt>Bấm gọi quán</dt><dd>{{ report.totals.calls }}</dd></div><div><dt>Bấm fanpage</dt><dd>{{ report.totals.fanpageClicks }}</dd></div></dl>
      <section class="rd-admin-section"><h3>Chỉ đường theo ngày</h3><ol class="rd-metrics__days"><li v-for="day in report.days" :key="day.dayKey"><span>{{ dateLabel(day.dayKey) }}</span><strong>{{ day.counts.directionClicks }}</strong><span class="rd-metrics__bar" :style="{ width: `${day.counts.directionClicks / maxDirections * 100}%` }" aria-hidden="true"></span></li></ol></section>
      <p v-if="!report.totals.directionClicks" class="rd-callout rd-callout--warn">Tuần này chưa ghi nhận lượt bấm chỉ đường nào.</p>
      <section v-if="report.items.length" class="rd-admin-section"><h3>Theo địa điểm</h3><ul class="rd-metrics__places"><li v-for="place in report.items" :key="place.placeId"><RouterLink class="rd-metrics__link" :to="`/dia-diem/${place.placeId}`">{{ place.name }}</RouterLink><strong>{{ place.counts.directionClicks }} lượt chỉ đường</strong><span>{{ place.counts.views }} lượt xem · {{ place.counts.calls }} gọi quán · {{ place.counts.fanpageClicks }} fanpage</span></li></ul></section>
      <p v-else class="rd-callout rd-callout--warn">Chưa có địa điểm công khai để báo cáo.</p>
      <p class="rd-field__hint">Cập nhật: {{ new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(report.updatedAt)) }}. Lượt xem được chống đếm trùng theo khách, địa điểm và ngày.</p>
    </template>
  </div>
</template>
<style scoped>
.rd-metrics { display: grid; gap: var(--space-5); padding-bottom: var(--space-7); }
h1, h2, h3 { margin: 0; font-family: var(--font-display); }
h1 { font-size: 28px; } h2 { font-size: 20px; } h3 { font-size: 18px; }
header p { max-width: 760px; color: var(--ink-soft); line-height: 1.7; }
.rd-metrics__filters { display: flex; flex-wrap: wrap; align-items: end; gap: var(--space-3); }
.rd-metrics__filters input { min-height: var(--tap-min); padding: var(--space-2); font: inherit; font-size: 16px; color: var(--ink); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-chip); }
.rd-metrics__totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin: 0; }
.rd-metrics__totals > div { padding: var(--space-4); border: var(--border); border-radius: var(--radius-card); background: var(--paper-raised); }
dt { font-size: 13px; color: var(--ink-soft); } dd { margin: var(--space-2) 0 0; font-size: 28px; font-weight: 700; }
.rd-metrics__days, .rd-metrics__places { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-3); }
.rd-metrics__days li { display: grid; grid-template-columns: 1fr auto; gap: var(--space-1); }
.rd-metrics__bar { grid-column: 1 / -1; height: var(--space-2); background: var(--accent); border-radius: var(--radius-pill); }
.rd-metrics__places li { display: grid; gap: var(--space-1); border-bottom: var(--border); padding-bottom: var(--space-3); }
.rd-metrics__places li > span { color: var(--ink-soft); font-size: 13px; }
.rd-metrics__link { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; overflow-wrap: anywhere; }
@media (min-width: 1024px) { .rd-metrics__totals { grid-template-columns: repeat(4, minmax(0, 1fr)); } .rd-metrics__places li { grid-template-columns: minmax(0, 1fr) auto; } .rd-metrics__places li > span { grid-column: 1 / -1; } }
</style>
