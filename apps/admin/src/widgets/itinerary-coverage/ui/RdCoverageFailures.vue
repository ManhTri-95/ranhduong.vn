<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PACE_LABEL, TRIP_INTEREST_LABEL, TripInterest, type ItineraryCoverageFailure, type ItineraryCoverageReason, type ItineraryCoverageReport } from '@ranhduong/contracts';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';

const props = defineProps<{ report: ItineraryCoverageReport }>();
const days = ref('all');
const interest = ref('all');
const code = ref('all');
const shown = ref(50);
const names = computed(() => new Map(props.report.zones.map((zone) => [zone.slug, zone.name])));
const filtered = computed(() => props.report.failures.filter((f) => (days.value === 'all' || String(f.days) === days.value)
  && (interest.value === 'all' || (f.interest ?? 'default') === interest.value)
  && (code.value === 'all' || f.reasons.some((r) => r.code === code.value))));
watch([days, interest, code, () => props.report], () => { shown.value = 50; });
const columns = [{ key: 'trip', label: 'Tổ hợp' }, { key: 'date', label: 'Khởi hành' }, { key: 'interest', label: 'Gu' }, { key: 'reasons', label: 'Cần bổ sung' }];
const key = (f: ItineraryCoverageFailure) => `${f.days}-${f.pace}-${f.startDate}-${f.interest}`;
const weekday = (day: number) => day === 0 ? 'Chủ nhật' : `Thứ ${day + 1}`;
const dateLabel = (date: string) => date.split('-').reverse().join('/');
function reasonLabel(reason: ItineraryCoverageReason): string {
  const zones = reason.zoneSlugs.map((slug) => names.value.get(slug) ?? slug).join(', ') || 'Chưa gán được cụm';
  const issue = reason.code === 'not_enough_places' ? `Thiếu điểm: tìm được ${reason.available}/3 điểm ghé tối thiểu` : reason.code === 'missing_lunch' ? 'Thiếu bữa trưa' : 'Thiếu bữa tối';
  return `Ngày ${reason.day} · ${zones}: ${issue}`;
}
</script>

<template>
  <section aria-labelledby="coverage-failures-title">
    <h2 id="coverage-failures-title">Tổ hợp còn lỗi · {{ report.failed }}</h2>
    <div class="rd-coverage-filters">
      <label>Số ngày<select v-model="days" class="rd-input"><option value="all">Mọi số ngày</option><option v-for="day in 5" :key="day" :value="String(day)">{{ day }} ngày</option></select></label>
      <label>Gu<select v-model="interest" class="rd-input"><option value="all">Mọi gu</option><option value="default">Mặc định (không chọn gu)</option><option v-for="tag in TripInterest.options" :key="tag" :value="tag">{{ TRIP_INTEREST_LABEL[tag] }}</option></select></label>
      <label>Loại lỗi<select v-model="code" class="rd-input"><option value="all">Mọi loại lỗi</option><option value="not_enough_places">Thiếu điểm</option><option value="missing_lunch">Thiếu bữa trưa</option><option value="missing_dinner">Thiếu bữa tối</option></select></label>
    </div>
    <p role="status">{{ filtered.length }} tổ hợp khớp bộ lọc · đang hiện {{ Math.min(shown, filtered.length) }}.</p>
    <RdDataTable :columns="columns" :rows="filtered.slice(0, shown)" :row-key="key" caption="Các tổ hợp lịch trình còn thiếu điểm hoặc bữa ăn">
      <template #cell="{ row, column }">
        <span v-if="column.key === 'trip'">{{ row.days }} ngày · {{ PACE_LABEL[row.pace] }}</span>
        <span v-else-if="column.key === 'date'">{{ weekday(row.startWeekday) }} · {{ dateLabel(row.startDate) }}</span>
        <span v-else-if="column.key === 'interest'">{{ row.interest ? TRIP_INTEREST_LABEL[row.interest] : 'Mặc định (không chọn gu)' }}</span>
        <ul v-else class="rd-coverage-reasons"><li v-for="(reason, i) in row.reasons" :key="i">{{ reasonLabel(reason) }}</li></ul>
      </template>
      <template #card="{ row }">
        <h3>{{ row.days }} ngày · {{ PACE_LABEL[row.pace] }}</h3>
        <p>{{ weekday(row.startWeekday) }} · {{ dateLabel(row.startDate) }}<br />{{ row.interest ? TRIP_INTEREST_LABEL[row.interest] : 'Mặc định (không chọn gu)' }}</p>
        <ul class="rd-coverage-reasons"><li v-for="(reason, i) in row.reasons" :key="i">{{ reasonLabel(reason) }}</li></ul>
      </template>
      <template #empty><RdEmptyState :kind="report.failed ? 'no-match' : 'empty'" :title="report.failed ? 'Không có tổ hợp lỗi khớp bộ lọc.' : 'Mọi tổ hợp đều tạo được lịch trình đủ điểm và bữa ăn.'" /></template>
    </RdDataTable>
    <button v-if="shown < filtered.length" type="button" class="rd-btn rd-btn--outline" @click="shown += 50">Xem thêm 50 tổ hợp</button>
  </section>
</template>

<style scoped>
.rd-coverage-filters { display: grid; gap: var(--space-3); margin-block: var(--space-4); }
.rd-coverage-filters label { display: grid; gap: var(--space-2); min-width: 0; }
.rd-coverage-reasons { padding-left: var(--space-5); margin: 0; overflow-wrap: anywhere; }
.rd-coverage-reasons li + li { margin-top: var(--space-2); }
@media (min-width: 768px) { .rd-coverage-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
