<script setup lang="ts">
import { METRIC_FIELDS, PLACE_STATUS_LABEL } from '@ranhduong/contracts';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { PLACE_STATUS_CLASS } from '@/entities/place/model/status';
import type { TableColumn, TableSort } from '@/shared/lib/table';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import { DEFAULT_PLACE_SORT, formatCount, placeRows, type PlaceItem, type PlaceRow } from '../model/report';

const props = defineProps<{ items: readonly PlaceItem[] }>();
const q = ref('');
const sort = ref<TableSort | null>(DEFAULT_PLACE_SORT);
const rows = computed(() => placeRows(props.items, { q: q.value, sort: sort.value ?? DEFAULT_PLACE_SORT }));
const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Địa điểm', sortable: true },
  { key: 'directionClicks', label: 'Chỉ đường', sortable: true, firstDir: 'desc', width: '22%' },
  { key: 'views', label: 'Lượt xem', sortable: true, firstDir: 'desc', width: '12%' },
  { key: 'calls', label: 'Gọi quán', sortable: true, firstDir: 'desc', width: '12%' },
  { key: 'fanpageClicks', label: 'Fanpage', sortable: true, firstDir: 'desc', width: '12%' },
];
function count(row: PlaceRow, key: string): string {
  const field = METRIC_FIELDS.find((name) => name === key);
  return field ? formatCount(row.counts[field]) : '';
}
</script>

<template>
  <section class="rd-admin-section" aria-labelledby="metrics-places-title">
    <div class="rd-metrics-places__head">
      <h2 id="metrics-places-title" class="rd-admin-section__title">Theo địa điểm</h2>
      <div class="rd-metrics-places__search">
        <label class="rd-sr-only" for="metrics-places-q">Tìm địa điểm trong báo cáo</label>
        <input id="metrics-places-q" v-model="q" class="rd-input" type="search" autocomplete="off" placeholder="Tìm địa điểm, gõ không dấu được" />
      </div>
    </div>
    <RdDataTable v-model:sort="sort" :columns="COLUMNS" :rows="rows.active" :row-key="(row) => row.placeId" caption="Lượt bấm và lượt xem theo địa điểm trong tuần">
      <template #cell="{ row, column }">
        <div v-if="column.key === 'name'" class="rd-metrics-places__name">
          <RouterLink class="rd-admin-row-title" :to="`/dia-diem/${row.placeId}`">{{ row.name }}</RouterLink>
          <span v-if="row.status !== 'active'" :class="['rd-status', PLACE_STATUS_CLASS[row.status]]">{{ PLACE_STATUS_LABEL[row.status] }}</span>
        </div>
        <div v-else-if="column.key === 'directionClicks'" class="rd-metrics-places__directions">
          <span class="rd-metrics-places__count">{{ count(row, column.key) }}</span>
          <span class="rd-metrics-places__track" aria-hidden="true"><span v-if="row.barPct > 0" class="rd-metrics-places__bar" :style="{ width: `${row.barPct}%` }"></span></span>
        </div>
        <span v-else class="rd-metrics-places__count">{{ count(row, column.key) }}</span>
      </template>
      <template #card="{ row }">
        <div class="rd-metrics-places__name">
          <RouterLink class="rd-admin-row-title" :to="`/dia-diem/${row.placeId}`">{{ row.name }}</RouterLink>
          <span v-if="row.status !== 'active'" :class="['rd-status', PLACE_STATUS_CLASS[row.status]]">{{ PLACE_STATUS_LABEL[row.status] }}</span>
        </div>
        <span class="rd-metrics-places__track rd-metrics-places__track--card" aria-hidden="true"><span v-if="row.barPct > 0" class="rd-metrics-places__bar" :style="{ width: `${row.barPct}%` }"></span></span>
        <p class="rd-quiet">
          <strong class="rd-metrics-places__strong">{{ formatCount(row.counts.directionClicks) }} chỉ đường</strong>
          · {{ formatCount(row.counts.views) }} lượt xem · {{ formatCount(row.counts.calls) }} gọi quán · {{ formatCount(row.counts.fanpageClicks) }} fanpage
        </p>
      </template>
      <template #empty>
        <RdEmptyState v-if="q.trim()" kind="no-match" :title="`Không có địa điểm có lượt nào khớp “${q.trim()}”.`" />
        <RdEmptyState v-else kind="empty" title="Tuần này chưa có địa điểm nào được xem hay bấm." />
      </template>
    </RdDataTable>
    <details v-if="rows.idle.length" class="rd-metrics-places__idle">
      <summary>{{ rows.idle.length }} địa điểm chưa có lượt nào tuần này</summary>
      <ul>
        <li v-for="row in rows.idle" :key="row.placeId">
          <RouterLink class="rd-admin-link" :to="`/dia-diem/${row.placeId}`">{{ row.name }}</RouterLink>
          <span v-if="row.status !== 'active'" :class="['rd-status', PLACE_STATUS_CLASS[row.status]]">{{ PLACE_STATUS_LABEL[row.status] }}</span>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
.rd-metrics-places__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.rd-metrics-places__search { flex: 0 1 360px; min-width: 0; }
.rd-metrics-places__name { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); min-width: 0; }
.rd-metrics-places__count { font-variant-numeric: tabular-nums; }
.rd-metrics-places__directions { display: flex; align-items: center; gap: var(--space-3); }
.rd-metrics-places__directions .rd-metrics-places__count { flex: 0 0 4ch; font-weight: 700; }
.rd-metrics-places__track { display: flex; flex: 1; height: var(--space-2); }
/* Trong thẻ (xếp dọc) thanh không co giãn theo chiều cao. */
.rd-metrics-places__track--card { flex: none; width: 100%; }
.rd-metrics-places__bar { min-width: 2px; border-radius: 0 4px 4px 0; background: var(--ink); }
.rd-metrics-places__strong { color: var(--ink); }
.rd-metrics-places__idle summary { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); font-weight: 600; cursor: pointer; }
.rd-metrics-places__idle summary::before { content: '▸'; }
.rd-metrics-places__idle[open] summary::before { content: '▾'; }
.rd-metrics-places__idle ul { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); margin: 0; padding: 0; list-style: none; }
.rd-metrics-places__idle li { display: inline-flex; align-items: center; gap: var(--space-2); }
</style>
