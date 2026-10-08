<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type AdminPlaceSummary } from '@ranhduong/contracts';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { statusChip, verifySourceLabel } from '@/entities/place/model/status';
import { primaryAction, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { daysAgoText } from '@/shared/lib/time';
import { filtersFromQuery, filtersToQuery, LIST_TABS, NO_ZONE, tabCounts, VERIFY_FILTERS, visibleRows, type ListFilters, type ListSort } from '../model/filters';
import { usePlaceList } from '../model/use-place-list';

const route = useRoute();
const router = useRouter();
const { load, rows, zones, reload } = usePlaceList();

/** Bộ lọc ghi vào query URL; quay lại từ form thì trang dựng lại từ query nên giữ nguyên. */
const filters = ref<ListFilters>(filtersFromQuery(route.query));
watch(filters, (value) => void router.replace({ query: filtersToQuery(value) }), { deep: true });

/** Mốc cho "Cần xác minh lại" và "N ngày trước"; lấy lại mỗi lần tải danh sách. */
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
    zone: row.zone ? (zoneNames.value.get(row.zone) ?? row.zone) : 'Chưa chọn',
    verify: verifySourceLabel(row.category, row.verifySource),
    verified: row.lastVerifiedAt ? daysAgoText(row.lastVerifiedAt, now.value) : 'Chưa xác minh',
  })),
);

const SORT_COLUMNS = { name: ['name', '-name'], verified: ['verified', '-verified'] } as const satisfies Record<string, readonly [ListSort, ListSort]>;
type SortColumn = keyof typeof SORT_COLUMNS;
function sortBy(column: SortColumn): void {
  const [ascending, descending] = SORT_COLUMNS[column];
  filters.value.sort = filters.value.sort === ascending ? descending : ascending;
}
function ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
  const [ascending, descending] = SORT_COLUMNS[column];
  if (filters.value.sort === ascending) return 'ascending';
  return filters.value.sort === descending ? 'descending' : 'none';
}
const SORT_MARK = { ascending: '↑', descending: '↓', none: '' } as const;

const notice = ref<string | null>(null);
const dialog = ref<{ place: AdminPlaceSummary; start: DialogStep } | null>(null);

function openDialog(place: AdminPlaceSummary, start: DialogStep): void {
  notice.value = null;
  dialog.value = { place, start };
}
function onPrimary(place: AdminPlaceSummary, action: PlaceAction): void {
  const step = stepFor(action);
  if (step) openDialog(place, step);
}
function onDone(message: string): void {
  notice.value = message;
}
/** Đóng hộp thoại (xong hay huỷ) thì tải lại để số đếm, trạng thái luôn mới. */
function onDialogClose(): void {
  dialog.value = null;
  void reload();
}
</script>

<template>
  <div class="place-list">
    <p v-if="notice" class="rd-callout rd-callout--ok" role="status">{{ notice }}</p>

    <div class="tabs" role="group" aria-label="Lọc theo trạng thái">
      <button
        v-for="tab in LIST_TABS"
        :key="tab.value"
        type="button"
        class="rd-chip rd-chip--filter"
        :aria-pressed="filters.tab === tab.value"
        @click="filters.tab = tab.value"
      >
        {{ tab.label }} <span class="count">{{ counts[tab.value] }}</span>
      </button>
    </div>

    <div class="filters">
      <div class="rd-field search">
        <label class="rd-field__label" for="place-list-q">Tìm theo tên</label>
        <input id="place-list-q" v-model="filters.q" class="rd-input" type="search" autocomplete="off" placeholder="Tên hoặc tên khác, gõ không dấu được" />
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-zone">Cụm</label>
        <select id="place-list-zone" v-model="filters.zone" class="rd-input">
          <option value="">Mọi cụm</option>
          <option v-for="zone in zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option>
          <option :value="NO_ZONE">Chưa chọn cụm</option>
        </select>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-category">Danh mục</label>
        <select id="place-list-category" v-model="filters.category" class="rd-input">
          <option value="">Mọi danh mục</option>
          <option v-for="category in PlaceCategory.options" :key="category" :value="category">{{ CATEGORY_LABEL[category] }}</option>
        </select>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-verify">Nguồn xác nhận</label>
        <select id="place-list-verify" v-model="filters.verify" class="rd-input">
          <option value="">Mọi nguồn xác nhận</option>
          <option v-for="option in VERIFY_FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
    </div>

    <p v-if="load.kind === 'loading'" class="rd-quiet" aria-busy="true">Đang tải danh sách…</p>
    <div v-else-if="load.kind === 'error'" class="rd-callout rd-callout--bad" role="alert">
      <p class="line">{{ load.message }}</p>
      <RouterLink v-if="load.login" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" @click="reload">Thử lại</button>
    </div>
    <template v-else>
      <p class="rd-quiet" aria-live="polite">Đang hiện {{ items.length }} trong {{ rows.length }} địa điểm</p>
      <p v-if="rows.length === 0" class="empty">Chưa có địa điểm nào. Bấm "Thêm địa điểm" để nhập chỗ đầu tiên.</p>
      <p v-else-if="items.length === 0" class="empty">Không có địa điểm nào khớp bộ lọc.</p>
      <div v-else class="table-box">
        <table class="table">
          <thead>
            <tr>
              <th :aria-sort="ariaSort('name')">
                <button type="button" class="sort" @click="sortBy('name')">Tên <span aria-hidden="true">{{ SORT_MARK[ariaSort('name')] }}</span></button>
              </th>
              <th>Danh mục</th>
              <th>Cụm</th>
              <th>Trạng thái</th>
              <th>Xác nhận</th>
              <th :aria-sort="ariaSort('verified')">
                <button type="button" class="sort" @click="sortBy('verified')">
                  Xác minh lần cuối <span aria-hidden="true">{{ SORT_MARK[ariaSort('verified')] }}</span>
                </button>
              </th>
              <th>Ảnh</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.row.id">
              <td>
                <RouterLink class="name" :to="`/dia-diem/${item.row.id}`">{{ item.row.name }}</RouterLink>
                <div v-if="item.row.aliases.length > 0" class="rd-quiet">{{ item.row.aliases.join('; ') }}</div>
              </td>
              <td>{{ item.categories }}</td>
              <td>{{ item.zone }}</td>
              <td><span :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span></td>
              <td>{{ item.verify }}</td>
              <td class="rd-quiet">{{ item.verified }}</td>
              <td>{{ item.row.photoCount }}</td>
              <td class="row-actions">
                <RouterLink v-if="item.primary.kind === 'edit'" class="rd-btn rd-btn--outline" :to="`/dia-diem/${item.row.id}`">{{ item.primary.label }}</RouterLink>
                <button v-else type="button" class="rd-btn rd-btn--outline" @click="onPrimary(item.row, item.primary)">{{ item.primary.label }}</button>
                <button type="button" class="rd-icon-btn" :aria-label="`Thao tác khác: ${item.row.name}`" @click="openDialog(item.row, { kind: 'menu' })">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <RdPlaceActionsDialog
      v-if="dialog"
      :key="dialog.place.id"
      :place="dialog.place"
      :start="dialog.start"
      :now="now"
      @done="onDone"
      @close="onDialogClose"
    />
  </div>
</template>

<style scoped>
.place-list { display: flex; flex-direction: column; gap: var(--space-4); }
.tabs { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.count { font-weight: 500; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3); }
.filters .rd-field { flex: 1 1 180px; }
.filters .search { flex: 2 1 260px; }
.line { margin: 0; }
.empty { margin: 0; padding: var(--space-5); text-align: center; color: var(--ink-soft); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
/* Bảng rộng cuộn ngang trong khung của nó; trang không cuộn ngang ở 390px. */
.table-box { overflow-x: auto; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.table { width: 100%; border-collapse: collapse; font: 400 14px/1.4 var(--font-body); }
.table th { padding: 10px 12px; border-bottom: var(--border); text-align: left; font-size: 13px; font-weight: 600; color: var(--ink-soft); white-space: nowrap; }
.table td { padding: 6px 12px; border-bottom: var(--border-hair) solid var(--mist); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: 0; }
/* Chip trạng thái không bẻ dòng (bản mẫu AdminPlaces); bảng đã cuộn ngang trong khung. */
.table .rd-status { white-space: nowrap; }
.name { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--ink); font-weight: 700; }
.sort { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.row-actions { white-space: nowrap; text-align: right; }
.row-actions > * { vertical-align: middle; }
.row-actions > * + * { margin-left: var(--space-2); }
</style>
