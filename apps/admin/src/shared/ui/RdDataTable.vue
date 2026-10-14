<script setup lang="ts" generic="T">
import { ariaSort, columnClass, SORT_MARK, toggleSort, type TableColumn, type TableSort } from '../lib/table';
import RdSkeleton from './RdSkeleton.vue';

defineProps<{ columns: readonly TableColumn[]; rows: readonly T[]; rowKey: (row: T) => string; caption: string; loading?: boolean }>();
const sort = defineModel<TableSort | null>('sort', { default: null });
defineSlots<{
  cell(props: { row: T; column: TableColumn }): unknown;
  card(props: { row: T }): unknown;
  empty(): unknown;
}>();
</script>

<template>
  <div class="rd-admin-table-wrap">
    <template v-if="loading">
      <RdSkeleton class="rd-admin-only-table" :rows="6" variant="table" />
      <RdSkeleton class="rd-admin-only-cards" :rows="4" variant="card" />
    </template>
    <slot v-else-if="rows.length === 0" name="empty" />
    <template v-else>
      <table class="rd-admin-table">
        <caption class="rd-sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="columnClass(column)"
              :style="column.width ? { width: column.width } : undefined"
              :aria-sort="column.sortable ? ariaSort(sort, column.key) : undefined"
            >
              <button v-if="column.sortable" type="button" class="rd-admin-table__sort" @click="sort = toggleSort(sort, column)">
                {{ column.label }} <span aria-hidden="true">{{ SORT_MARK[ariaSort(sort, column.key)] }}</span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="rowKey(row)">
            <td v-for="column in columns" :key="column.key" :class="columnClass(column)"><slot name="cell" :row="row" :column="column" /></td>
          </tr>
        </tbody>
      </table>
      <ul class="rd-admin-cards">
        <li v-for="row in rows" :key="rowKey(row)" class="rd-admin-card"><slot name="card" :row="row" /></li>
      </ul>
    </template>
  </div>
</template>
