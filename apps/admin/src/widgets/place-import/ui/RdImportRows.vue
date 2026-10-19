<script setup lang="ts">
import type { CsvImportRow } from '@ranhduong/contracts';
import { computed, useSlots } from 'vue';
import type { TableColumn } from '@/shared/lib/table';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdImportRowDetails from './RdImportRowDetails.vue';

defineProps<{ rows: CsvImportRow[]; caption: string }>();
const slots = useSlots();
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: 'Dòng · Địa điểm', width: '25%' },
  { key: 'details', label: 'Thông tin' },
  ...(slots.action ? [{ key: 'action', label: 'Lựa chọn', width: '180px' }] : []),
]);
const key = (row: CsvImportRow) => String(row.row);
</script>

<template>
  <RdDataTable :rows="rows" :columns="columns" :row-key="key" :caption="caption">
    <template #cell="{ row, column }">
      <strong v-if="column.key === 'name'">{{ row.row }} · {{ row.name || '(chưa có tên)' }}</strong>
      <RdImportRowDetails v-else-if="column.key === 'details'" :row="row" />
      <slot v-else name="action" :row="row" />
    </template>
    <template #card="{ row }">
      <strong>Dòng {{ row.row }} · {{ row.name || '(chưa có tên)' }}</strong>
      <RdImportRowDetails :row="row" />
      <slot name="action" :row="row" />
    </template>
  </RdDataTable>
</template>
