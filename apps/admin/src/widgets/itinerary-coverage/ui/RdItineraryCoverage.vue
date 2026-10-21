<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ItineraryCoverageQuery, ItineraryTransport, metricsDayKey, TRANSPORT_LABEL, TRIP_WITH_LABEL, TripWith } from '@ranhduong/contracts';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import { useCoverageReport } from '../model/use-coverage-report';
import RdCoverageCounts from './RdCoverageCounts.vue';
import RdCoverageFailures from './RdCoverageFailures.vue';

const route = useRoute();
const today = metricsDayKey(new Date());
const form = ref<ItineraryCoverageQuery>({ startDate: today, transport: 'motorbike', with: 'friends' });
const { report, state, run } = useCoverageReport();
const queryError = ref('');
const loading = computed(() => state.value.kind === 'loading');
const checkedAt = computed(() => report.value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(report.value.checkedAt)) : '');
async function submit(): Promise<void> {
  const parsed = ItineraryCoverageQuery.safeParse(form.value);
  if (!parsed.success) { queryError.value = parsed.error.issues[0]?.message ?? 'Kiểm tra lại lựa chọn.'; return; }
  queryError.value = '';
  await run(parsed.data);
}
</script>

<template>
  <div class="rd-admin-page rd-coverage-page">
    <RdPageHeader title="Độ phủ lịch trình">
      <template #meta><span>Chạy thử 1–5 ngày × 2 nhịp × 7 thứ khởi hành × 5 gu riêng lẻ và bộ gu mặc định: 420 tổ hợp.</span><span>Báo cáo chỉ đọc dữ liệu, không lưu lịch trình.</span></template>
    </RdPageHeader>
    <form class="rd-coverage-controls" @submit.prevent="submit">
      <fieldset :disabled="loading">
        <legend>Điều kiện chạy thử</legend>
        <label>Bắt đầu kiểm tra từ ngày<input v-model="form.startDate" class="rd-input" type="date" :min="today" required /><small>Kiểm tra 7 ngày khởi hành liên tiếp từ ngày này; mùa mưa theo từng ngày thực tế.</small></label>
        <label>Phương tiện<select v-model="form.transport" class="rd-input"><option v-for="mode in ItineraryTransport.options" :key="mode" :value="mode">{{ TRANSPORT_LABEL[mode] }}</option></select></label>
        <label>Đi cùng ai<select v-model="form.with" class="rd-input"><option v-for="audience in TripWith.options" :key="audience" :value="audience">{{ TRIP_WITH_LABEL[audience] }}</option></select></label>
        <button class="rd-btn rd-btn--primary" type="submit">{{ loading ? 'Đang chạy 420 tổ hợp…' : report ? 'Chạy lại báo cáo' : 'Chạy báo cáo' }}</button>
      </fieldset>
      <p v-if="queryError" role="alert">{{ queryError }}</p>
    </form>
    <div v-if="loading" role="status" aria-live="polite"><p>Đang chọn điểm, sắp tuyến và kiểm tra bữa ăn. Giữ trang này mở một lát nhé.</p><RdSkeleton :rows="3" variant="card" /></div>
    <RdEmptyState v-else-if="state.kind === 'error'" kind="error" title="Chưa chạy được báo cáo." :body="state.login ? 'Phiên đăng nhập đã hết.' : 'Kiểm tra kết nối rồi chạy lại. Các lựa chọn vẫn được giữ.'">
      <RouterLink v-if="state.login" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" @click="submit">Thử lại</button>
    </RdEmptyState>
    <template v-else-if="report">
      <section class="rd-coverage-summary" aria-labelledby="coverage-summary-title">
        <h2 id="coverage-summary-title">Kết quả chạy thử</h2>
        <p>{{ report.startDate }} – {{ report.endDate }} · {{ TRANSPORT_LABEL[report.transport] }} · {{ TRIP_WITH_LABEL[report.with] }} · Không chọn nơi ở.</p>
        <p>Chạy lúc {{ checkedAt }} (giờ Việt Nam). Kết quả theo dữ liệu lúc chạy; thay lựa chọn ở trên rồi bấm Chạy lại để cập nhật.</p>
        <dl class="rd-coverage-totals"><div><dt>Đã kiểm tra</dt><dd>{{ report.total }}</dd></div><div><dt>Đủ điểm và bữa</dt><dd>{{ report.passed }}</dd></div><div><dt>Còn lỗi</dt><dd>{{ report.failed }}</dd></div></dl>
      </section>
      <RdCoverageCounts :zones="report.zones" />
      <RdCoverageFailures :report="report" />
    </template>
    <RdEmptyState v-else kind="empty" title="Kiểm tra trước khi bổ sung dữ liệu." body="Chọn ngày và bấm Chạy báo cáo để biết cụm nào thiếu điểm, tổ hợp nào thiếu bữa ăn." />
  </div>
</template>

<style scoped>
.rd-coverage-page { display: grid; gap: var(--space-6); }
.rd-coverage-controls fieldset { border: var(--border); border-radius: var(--radius-card); padding: var(--space-4); margin: 0; display: grid; gap: var(--space-4); min-width: 0; }
.rd-coverage-controls label { display: grid; gap: var(--space-2); min-width: 0; }
.rd-coverage-controls small { color: var(--ink-soft); }
.rd-coverage-controls button { align-self: end; }
.rd-coverage-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
.rd-coverage-totals div { border: var(--border); border-radius: var(--radius-card); padding: var(--space-3); background: var(--paper-raised); }
.rd-coverage-totals dd { margin: var(--space-2) 0 0; font-size: 1.5rem; font-weight: 700; }
@media (min-width: 1024px) { .rd-coverage-controls fieldset { grid-template-columns: 2fr 1fr 1fr auto; } }
</style>
