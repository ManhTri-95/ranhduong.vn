<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type AdminPlaceSummary } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router';
import { missingLabels } from '@/entities/place/model/missing';
import { statusChip, verifySourceLabel } from '@/entities/place/model/status';
import { primaryAction, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { plainQuery, readListReturn, sameQuery, saveListReturn, scrollToRestore } from '@/shared/lib/list-return';
import type { TableColumn, TableSort } from '@/shared/lib/table';
import { daysAgoText, updatedAgoText } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdFilterBar from '@/shared/ui/RdFilterBar.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import {
  clearFilters,
  filtersFromQuery,
  filtersToQuery,
  hasActiveFilters,
  LIST_TABS,
  NO_ZONE,
  SORT_OPTIONS,
  sortToTable,
  tableToSort,
  tabCounts,
  VERIFY_FILTERS,
  visibleRows,
  withKnownZone,
  type ListFilters,
} from '../model/filters';
import { usePlaceList } from '../model/use-place-list';
import RdPlaceRowActions from './RdPlaceRowActions.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { load, rows, zones, reload } = usePlaceList();

/** Cột theo spec S28 mục 6.3; ở 768–1023px chỉ còn Địa điểm, Trạng thái, Còn thiếu, Thao tác. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Địa điểm', sortable: true },
  { key: 'status', label: 'Trạng thái', width: '128px' },
  { key: 'missing', label: 'Còn thiếu', width: '150px' },
  { key: 'verified', label: 'Xác minh', sortable: true, width: '136px', hideBelow: 1024 },
  { key: 'photos', label: 'Ảnh', width: '56px', hideBelow: 1024 },
  { key: 'updated', label: 'Cập nhật', sortable: true, firstDir: 'desc', width: '120px', hideBelow: 1024 },
  { key: 'actions', label: 'Thao tác', width: '172px' },
];

/** Bộ lọc ghi vào query URL; đổi từ ngoài (tab, thanh bên, Back) thì đọc lại từ URL. */
const filters = ref<ListFilters>(filtersFromQuery(route.query));
watch(filters, (value) => void router.replace({ query: filtersToQuery(value) }), { deep: true });
watch(
  () => route.query,
  (query) => {
    const next = filtersFromQuery(query);
    if (!sameQuery(filtersToQuery(next), filtersToQuery(filters.value))) filters.value = next;
  },
);
// Đã tải xong các cụm: cụm cũ trong URL không còn thì về "Mọi cụm".
watch(zones, (list) => {
  filters.value = withKnownZone(filters.value, list.map((zone) => zone.slug));
});

/** Mốc cho "Cần xác minh lại" và thời gian tương đối; lấy lại mỗi lần tải danh sách. */
const now = ref(new Date());
watch(rows, () => {
  now.value = new Date();
});

const counts = computed(() => tabCounts(rows.value, filters.value, now.value));
const zoneNames = computed(() => new Map(zones.value.map((zone) => [zone.slug, zone.name])));
const items = computed(() =>
  visibleRows(rows.value, filters.value, now.value).map((row) => ({
    row,
    chip: statusChip(row, now.value),
    primary: primaryAction(row, now.value),
    categories: [row.category, ...row.alsoCategories].map((c) => CATEGORY_LABEL[c]).join(', '),
    zone: row.zone ? (zoneNames.value.get(row.zone) ?? row.zone) : 'Chưa chọn cụm',
    missing: missingLabels(row.activationIssues),
    verify: verifySourceLabel(row.category, row.verifySource),
    verified: row.lastVerifiedAt ? daysAgoText(row.lastVerifiedAt, now.value) : 'Chưa xác minh',
    updated: updatedAgoText(row.updatedAt, now.value),
    fullName: [row.name, ...row.aliases].join(' · '),
  })),
);
type Item = (typeof items.value)[number];
const rowKey = (item: Item) => item.row.id;

const tableSort = computed<TableSort | null>({
  get: () => sortToTable(filters.value.sort),
  set: (value) => {
    filters.value.sort = tableToSort(value);
  },
});
const filtering = computed(() => hasActiveFilters(filters.value));
function clear(): void {
  filters.value = clearFilters(filters.value);
}
function tabLink(tab: ListFilters['tab']) {
  return { query: filtersToQuery({ ...filters.value, tab }) };
}

const dialog = ref<{ place: AdminPlaceSummary; start: DialogStep } | null>(null);
function openDialog(place: AdminPlaceSummary, start: DialogStep): void {
  dialog.value = { place, start };
}
function onPrimary(place: AdminPlaceSummary, action: PlaceAction): void {
  const step = stepFor(action);
  if (step) openDialog(place, step);
}
/** Đóng hộp thoại (xong hay huỷ) thì tải lại để số đếm, trạng thái luôn mới; các dòng đang hiện giữ nguyên trong lúc tải. */
function onDialogClose(): void {
  dialog.value = null;
  void reload();
}

// Nhớ bộ lọc và vị trí cuộn khi rời danh sách; quay lại đúng bộ lọc đó thì cuộn về chỗ cũ khi dữ liệu đã tải.
onBeforeRouteLeave(() => {
  saveListReturn('places', { query: plainQuery(route.query), scrollY: Math.round(window.scrollY) });
});
let restored = false;
watch(
  () => load.value.kind,
  async (kind) => {
    if (kind !== 'ready' || restored) return;
    restored = true;
    const top = scrollToRestore(readListReturn('places'), plainQuery(route.query));
    if (top === null) return;
    await nextTick();
    window.scrollTo({ top });
  },
);
</script>

<template>
  <div class="rd-admin-page">
    <RdPageHeader title="Địa điểm">
      <template #actions>
        <RouterLink class="rd-btn rd-btn--secondary" to="/import">Import CSV</RouterLink>
        <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
      </template>
      <template v-if="load.kind === 'ready'" #meta>{{ rows.length }} địa điểm</template>
    </RdPageHeader>

    <nav class="rd-tabs" aria-label="Lọc theo trạng thái">
      <ul class="rd-tabs__list">
        <li v-for="tab in LIST_TABS" :key="tab.value">
          <RouterLink v-slot="{ href, navigate }" :to="tabLink(tab.value)" replace custom>
            <a :href="href" class="rd-tab" :aria-current="filters.tab === tab.value ? 'page' : undefined" @click="navigate">
              {{ tab.label }} <span class="rd-chip__count">{{ counts[tab.value] }}</span>
            </a>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <RdFilterBar label="Lọc địa điểm" :active="filtering" @clear="clear">
      <div class="rd-admin-filters__search">
        <label class="rd-sr-only" for="place-list-q">Tìm theo tên</label>
        <input id="place-list-q" v-model="filters.q" class="rd-input" type="search" autocomplete="off" placeholder="Tên hoặc tên khác, gõ không dấu được" />
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-zone">Cụm</label>
        <select id="place-list-zone" v-model="filters.zone" class="rd-input">
          <option value="">Mọi cụm</option>
          <option v-for="zone in zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option>
          <option :value="NO_ZONE">Chưa chọn cụm</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-category">Danh mục</label>
        <select id="place-list-category" v-model="filters.category" class="rd-input">
          <option value="">Mọi danh mục</option>
          <option v-for="category in PlaceCategory.options" :key="category" :value="category">{{ CATEGORY_LABEL[category] }}</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-verify">Nguồn xác nhận</label>
        <select id="place-list-verify" v-model="filters.verify" class="rd-input">
          <option value="">Mọi nguồn xác nhận</option>
          <option v-for="option in VERIFY_FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-sort">Xếp</label>
        <select id="place-list-sort" v-model="filters.sort" class="rd-input">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">Xếp: {{ option.label }}</option>
        </select>
      </div>
    </RdFilterBar>

    <p v-if="load.kind === 'ready' && rows.length > 0" class="rd-quiet" aria-live="polite">Đang hiện {{ items.length }} trong {{ rows.length }} địa điểm</p>

    <RdEmptyState v-if="load.kind === 'error'" kind="error" :title="load.message">
      <RouterLink v-if="load.login" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" @click="reload">Thử lại</button>
    </RdEmptyState>
    <RdDataTable
      v-else
      v-model:sort="tableSort"
      :columns="COLUMNS"
      :rows="items"
      :row-key="rowKey"
      :loading="load.kind === 'loading'"
      caption="Danh sách địa điểm"
    >
      <template #cell="{ row: item, column }">
        <div v-if="column.key === 'name'" class="rd-admin-stack">
          <RouterLink class="rd-admin-row-title rd-admin-truncate" :to="`/dia-diem/${item.row.id}`" :title="item.fullName">{{ item.row.name }}</RouterLink>
          <span class="rd-quiet rd-admin-truncate">{{ item.categories }} · {{ item.zone }}</span>
        </div>
        <span v-else-if="column.key === 'status'" :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span>
        <template v-else-if="column.key === 'missing'">
          <span v-if="item.missing.length === 0" class="rd-status rd-status--ok">Đủ</span>
          <span v-else>{{ item.missing.join(', ') }}</span>
        </template>
        <div v-else-if="column.key === 'verified'" class="rd-admin-stack">
          <span>{{ item.verify }}</span>
          <span class="rd-quiet">{{ item.verified }}</span>
        </div>
        <template v-else-if="column.key === 'photos'">{{ item.row.photoCount }}</template>
        <span v-else-if="column.key === 'updated'" class="rd-quiet">{{ item.updated }}</span>
        <RdPlaceRowActions v-else :place="item.row" :primary="item.primary" @primary="onPrimary(item.row, $event)" @menu="openDialog(item.row, { kind: 'menu' })" />
      </template>
      <template #card="{ row: item }">
        <div class="rd-admin-row-actions">
          <RouterLink class="rd-admin-row-title" :to="`/dia-diem/${item.row.id}`">{{ item.row.name }}</RouterLink>
          <span :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span>
        </div>
        <p class="rd-quiet">{{ item.categories }} · {{ item.zone }}</p>
        <p>{{ item.missing.length > 0 ? `Còn thiếu: ${item.missing.join(', ')}` : 'Đủ điều kiện kích hoạt' }}</p>
        <p class="rd-quiet">{{ item.verified }} · {{ item.row.photoCount }} ảnh</p>
        <RdPlaceRowActions :place="item.row" :primary="item.primary" @primary="onPrimary(item.row, $event)" @menu="openDialog(item.row, { kind: 'menu' })" />
      </template>
      <template #empty>
        <RdEmptyState v-if="rows.length === 0" kind="empty" title="Chưa có địa điểm nào." body="Bấm “Thêm địa điểm” để nhập chỗ đầu tiên.">
          <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
        </RdEmptyState>
        <RdEmptyState v-else-if="filtering" kind="no-match" title="Không có địa điểm khớp bộ lọc.">
          <button type="button" class="rd-btn rd-btn--outline" @click="clear">Xoá bộ lọc</button>
        </RdEmptyState>
        <RdEmptyState v-else kind="no-match" title="Không có địa điểm nào ở mục này." />
      </template>
    </RdDataTable>

    <RdPlaceActionsDialog
      v-if="dialog"
      :key="dialog.place.id"
      :place="dialog.place"
      :start="dialog.start"
      :now="now"
      @done="toast.show"
      @close="onDialogClose"
    />
  </div>
</template>
