<script setup lang="ts">
import type { PlaceCard, PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { fetchPlacePage, type PlaceListParams } from '~/entities/place/api/places';
import { appendUnique, listingHref } from '~/entities/place/lib/listing-query';
import { restoreListing, saveListing, type ListingHistory } from '~/entities/place/lib/listing-history';
import { discoveryHref, type DiscoveryFilter } from '~/entities/place/lib/discovery-query';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import RdFieldPlaceCard from '~/entities/place/ui/RdFieldPlaceCard.vue';
import { useApiBase } from '~/shared/api/client';
import { useListingRequest } from '../lib/use-listing-request';

const props = defineProps<{
  citySlug: string;
  /** Đường dẫn trang gốc, ví dụ /da-lat/ca-phe. */
  basePath: string;
  /** Query API của trang đang xem (danh mục hoặc cụm, thẻ, cursor, limit). */
  params: PlaceListParams;
  page: PlaceListResponse | null;
  /** Thẻ đang lọc, đọc từ URL. */
  tags: string[];
  /** Đang xem trang sau (URL có cursor). */
  paged: boolean;
  failed: boolean;
  now: Date | null;
  /** Editorial collection presentation; other consumers retain their default layout. */
  fieldGuide?: boolean;
  discoveryFilter?: DiscoveryFilter;
  heading?: string;
  refreshing?: boolean;
}>();
const emit = defineEmits<{ change: [items: PlaceCard[]] }>();

const apiBase = useApiBase();
const history = useState<ListingHistory>('place-listing-history', () => ({}));
const historyPath = useRoute().fullPath;
// Client-only: snapshots must never alter cached SSR HTML. Restoration is synchronous before router scroll restoration.
const saved = import.meta.client ? restoreListing(history.value, historyPath, props.page) : undefined;
const items = ref<PlaceCard[]>(saved?.items ?? props.page?.items ?? []);
const nextCursor = ref(saved ? saved.nextCursor : props.page?.nextCursor);
const paginationReady = ref(Boolean(props.page));
const request = useListingRequest(() => [props.params, props.page], () => paginationReady.value && !props.refreshing);
const loading = request.active;
const loadFailed = ref(false);
const listEl = ref<HTMLElement | null>(null);
const notice = ref('');
watch(items, value => emit('change', value), { immediate: true });
// Nuxt may retain the previous page while a new fetch key is pending. Its cursor belongs to the old context.
watch(() => JSON.stringify(props.params), () => { paginationReady.value = false; nextCursor.value = undefined; }, { flush: 'sync' });

// Bấm "Thử lại" ở dải lỗi đầu trang thì trang tải lại dữ liệu: bắt đầu lại từ trang mới nhận.
watch(
  () => props.page,
  (page) => {
    paginationReady.value = Boolean(page);
    const restored = import.meta.client ? restoreListing(history.value, historyPath, page) : undefined;
    items.value = restored?.items ?? page?.items ?? [];
    nextCursor.value = restored ? restored.nextCursor : page?.nextCursor;
    loadFailed.value = false;
    if (props.fieldGuide) notice.value = props.failed && !items.value.length ? 'Chưa tải được danh sách địa điểm.' : `Đang hiển thị ${items.value.length} địa điểm.`;
  },
);

const nextHref = computed(() => (paginationReady.value && !props.refreshing && nextCursor.value ? props.discoveryFilter ? discoveryHref(props.basePath, { ...props.discoveryFilter, cursor: nextCursor.value }) : listingHref(props.basePath, props.tags, nextCursor.value) : undefined));
const firstHref = computed(() => props.discoveryFilter ? discoveryHref(props.basePath, { ...props.discoveryFilter, cursor: undefined }) : listingHref(props.basePath, props.tags));

/**
 * Có JS: tải trang sau và nối vào danh sách, URL giữ nguyên. Chưa có JS, hoặc mở tab mới (Ctrl, Cmd, Shift, chuột giữa),
 * thì để trình duyệt đi theo link `?cursor=`.
 */
async function loadMore(event: MouseEvent): Promise<void> {
  if (!paginationReady.value || props.refreshing) { event.preventDefault(); return; }
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (loading.value || !nextCursor.value) return;
  loadFailed.value = false;
  const firstNew = items.value.length;
  const contextPage = props.page;
  await request.run(
    signal => fetchPlacePage(apiBase, props.citySlug, { ...props.params, cursor: nextCursor.value }, signal),
    async (more, current) => {
      items.value = appendUnique(items.value, more.items);
      nextCursor.value = more.nextCursor;
      notice.value = `Đã tải thêm ${items.value.length - firstNew} địa điểm. Đang hiển thị ${items.value.length} địa điểm.`;
      saveListing(history.value, historyPath, contextPage, { items: items.value, nextCursor: nextCursor.value });
      await nextTick();
      // Đưa focus tới thẻ đầu tiên vừa thêm, để bàn phím và trình đọc màn hình đi tiếp từ đó.
      if (current()) listEl.value?.querySelectorAll<HTMLAnchorElement>('a.rd-place')[firstNew]?.focus();
    },
    () => { loadFailed.value = true; },
  );
}
onMounted(() => {
  if (props.fieldGuide) notice.value = props.failed && !items.value.length ? 'Chưa tải được danh sách địa điểm.' : `Đang hiển thị ${items.value.length} địa điểm.`;
});
</script>

<template>
  <section :class="['listing', { 'rd-field-listing': fieldGuide }]" aria-labelledby="place-listing-title" :aria-busy="loading || refreshing">
    <p v-if="refreshing" class="rd-field-listing__search-note" role="status">Đang cập nhật ghi chép theo lựa chọn của bạn…</p>
    <header v-if="fieldGuide" class="rd-field-listing__heading"><div><p class="rd-field-kicker">Mở từng ghi chép, gặp từng nơi</p><h2 id="place-listing-title" tabindex="-1">{{ heading ?? 'Những nơi đáng rẽ vào.' }}</h2></div><p>{{ failed && !items.length ? 'Chưa tải được địa điểm' : `Đang hiển thị ${items.length} địa điểm` }}<span v-if="nextCursor"> · còn trang sau</span></p></header>
    <h2 v-else id="place-listing-title" class="visually-hidden">Danh sách địa điểm</h2>
    <p v-if="fieldGuide && discoveryFilter?.q" class="rd-field-listing__search-note">Kết quả theo độ khớp từ khóa; tối đa {{ params.limit ?? 20 }} nơi. Thử từ khóa cụ thể hơn nếu cần.</p>
    <div v-if="items.length" ref="listEl">
      <ul v-if="fieldGuide" class="rd-field-grid"><li v-for="(place, index) in items" :key="place.slug" :class="{ 'rd-field-grid__wide': index === 0 && Boolean(place.coverKey) }" data-rd-route-scene><RdFieldPlaceCard :place="place" :city-slug="citySlug" :now="now" :number="index + 1" :wide="index === 0 && Boolean(place.coverKey)" /></li></ul>
      <RdPlaceList v-else :places="items" :city-slug="citySlug" :now="now" />
    </div>
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách, bấm Thử lại ở đầu trang nhé.</p>
    <div v-else-if="tags.length || (discoveryFilter && (discoveryFilter.q || discoveryFilter.category || discoveryFilter.zone || discoveryFilter.rainSafe))" class="listing__empty">
      <p class="empty-note">{{ fieldGuide ? 'Chưa có địa điểm khớp bộ lọc này. Thử bỏ bớt một điều kiện nhé.' : 'Chưa có chỗ nào có đủ các thẻ đã chọn.' }}</p>
      <NuxtLink class="rd-btn rd-btn--outline" :to="basePath">Bỏ lọc</NuxtLink>
    </div>
    <p v-else-if="paged" class="empty-note">Hết danh sách rồi.</p>
    <slot v-else name="empty" />

    <ul v-if="loading" class="listing__skeleton" aria-hidden="true">
      <li v-for="n in 2" :key="n" class="rd-place">
        <div class="rd-place__thumb" />
        <div class="rd-place__body">
          <span class="skeleton-bar" />
          <span class="skeleton-bar skeleton-bar--short" />
        </div>
      </li>
    </ul>

    <div v-if="nextHref || paged" class="listing__more">
      <a v-if="nextHref" class="rd-btn rd-btn--outline" :href="nextHref" :aria-busy="loading" @click="loadMore">
        {{ loading ? 'Đang tải…' : 'Xem thêm' }}
      </a>
      <p v-if="loadFailed" class="empty-note" role="alert">Chưa tải thêm được, có thể mạng đang chập chờn. Bấm Xem thêm lần nữa nhé.</p>
      <!-- <a> thường, không dùng NuxtLink: cùng đường dẫn chỉ khác query thì router giữ vị trí cuộn, khách vẫn ở cuối trang. -->
      <a v-if="paged" class="listing__first" :href="firstHref">Về đầu danh sách</a>
    </div>
    <p v-if="fieldGuide" class="rd-field-listing__notice" role="status" aria-live="polite" aria-atomic="true">{{ notice }}</p>
  </section>
</template>

<style scoped>
.listing { display: flex; flex-direction: column; gap: var(--space-4); }
.listing__empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
.listing__more { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.listing__first { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
/* Khung xương tĩnh (không nhấp nháy) nên không cần xét prefers-reduced-motion. */
.listing__skeleton { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.skeleton-bar { display: block; height: 14px; border-radius: var(--radius-thumb); background: var(--mist); }
.skeleton-bar--short { width: 60%; }
</style>
