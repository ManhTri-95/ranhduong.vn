<script setup lang="ts">
import type { PlaceCard, PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { fetchPlacePage, type PlaceListParams } from '~/entities/place/api/places';
import { appendUnique, listingHref } from '~/entities/place/lib/listing-query';
import { restoreListing, saveListing, type ListingHistory } from '~/entities/place/lib/listing-history';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import { useApiBase } from '~/shared/api/client';

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
}>();

const apiBase = useApiBase();
const history = useState<ListingHistory>('place-listing-history', () => ({}));
const historyPath = useRoute().fullPath;
// Client-only: snapshots must never alter cached SSR HTML. Restoration is synchronous before router scroll restoration.
const saved = import.meta.client ? restoreListing(history.value, historyPath, props.page) : undefined;
const items = ref<PlaceCard[]>(saved?.items ?? props.page?.items ?? []);
const nextCursor = ref(saved ? saved.nextCursor : props.page?.nextCursor);
const loading = ref(false);
const loadFailed = ref(false);
const listEl = ref<HTMLElement | null>(null);

// Bấm "Thử lại" ở dải lỗi đầu trang thì trang tải lại dữ liệu: bắt đầu lại từ trang mới nhận.
watch(
  () => props.page,
  (page) => {
    const restored = import.meta.client ? restoreListing(history.value, historyPath, page) : undefined;
    if (restored) {
      items.value = restored.items;
      nextCursor.value = restored.nextCursor;
      return;
    }
    items.value = page?.items ?? [];
    nextCursor.value = page?.nextCursor;
    loadFailed.value = false;
  },
);

const nextHref = computed(() => (nextCursor.value ? listingHref(props.basePath, props.tags, nextCursor.value) : undefined));
const firstHref = computed(() => listingHref(props.basePath, props.tags));

/**
 * Có JS: tải trang sau và nối vào danh sách, URL giữ nguyên. Chưa có JS, hoặc mở tab mới (Ctrl, Cmd, Shift, chuột giữa),
 * thì để trình duyệt đi theo link `?cursor=`.
 */
async function loadMore(event: MouseEvent): Promise<void> {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (loading.value || !nextCursor.value) return;
  loading.value = true;
  loadFailed.value = false;
  const firstNew = items.value.length;
  try {
    const more = await fetchPlacePage(apiBase, props.citySlug, { ...props.params, cursor: nextCursor.value });
    items.value = appendUnique(items.value, more.items);
    nextCursor.value = more.nextCursor;
    saveListing(history.value, historyPath, props.page, { items: items.value, nextCursor: nextCursor.value });
    await nextTick();
    // Đưa focus tới thẻ đầu tiên vừa thêm, để bàn phím và trình đọc màn hình đi tiếp từ đó.
    listEl.value?.querySelectorAll<HTMLAnchorElement>('a.rd-place')[firstNew]?.focus();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="listing" aria-labelledby="place-listing-title">
    <h2 id="place-listing-title" class="visually-hidden">Danh sách địa điểm</h2>
    <div v-if="items.length" ref="listEl">
      <RdPlaceList :places="items" :city-slug="citySlug" :now="now" />
    </div>
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách, bấm Thử lại ở đầu trang nhé.</p>
    <div v-else-if="tags.length" class="listing__empty">
      <p class="empty-note">Chưa có chỗ nào có đủ các thẻ đã chọn.</p>
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
