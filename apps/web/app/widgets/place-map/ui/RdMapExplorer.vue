<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type BBox, type CityPublic, type PlaceCard, type PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchMapPlaces } from '~/entities/place/api/place-map';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import RdPlaceMap from '~/features/place-map/ui/RdPlaceMap.client.vue';
import { useApiBase } from '~/shared/api/client';
import { useClientNow } from '~/shared/lib/use-client-now';

const props = defineProps<{ city: CityPublic; initialPage: PlaceListResponse | null; category?: PlaceCategory; failed: boolean }>();
const emit = defineEmits<{ category: [value: PlaceCategory | undefined] }>();
const apiBase = useApiBase();
const now = useClientNow();
const places = ref<PlaceCard[]>(props.initialPage?.items ?? []);
const selectedSlug = ref<string | null>(null);
const selected = computed(() => places.value.find((place) => place.slug === selectedSlug.value));
const loading = ref(false);
const loadFailed = ref(props.failed);
const sheetMode = ref<'compact' | 'card' | 'list'>('list');
const selectedHeading = ref<HTMLElement | null>(null);
let bounds: BBox = props.city.mapBounds;
let controller: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;

async function load(): Promise<void> {
  clearTimeout(timer);
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loadFailed.value = false;
  try {
    const result = await fetchMapPlaces(apiBase, props.city.slug, bounds, props.category, request.signal);
    if (disposed || controller !== request) return;
    places.value = result;
    if (!result.some((place) => place.slug === selectedSlug.value)) selectedSlug.value = null;
  } catch {
    if (!disposed && controller === request && !request.signal.aborted) loadFailed.value = true;
  } finally {
    if (!disposed && controller === request) loading.value = false;
  }
}

function viewport(next: BBox): void {
  bounds = next;
  // Huỷ ngay khi viewport đổi; phản hồi vùng cũ không có cơ hội ghi đè trong lúc debounce.
  controller?.abort();
  clearTimeout(timer);
  timer = setTimeout(load, 200);
}

function filter(event: SubmitEvent): void {
  event.preventDefault();
  const button = event.submitter;
  if (button instanceof HTMLButtonElement) {
    emit('category', PlaceCategory.safeParse(button.value).success ? button.value as PlaceCategory : undefined);
  }
}

async function select(slug: string): Promise<void> {
  selectedSlug.value = slug;
  sheetMode.value = 'card';
  await nextTick();
  selectedHeading.value?.focus({ preventScroll: true });
}

watch(() => props.category, () => { selectedSlug.value = null; void load(); });
onMounted(load);
onBeforeUnmount(() => { disposed = true; controller?.abort(); clearTimeout(timer); });
</script>

<template>
  <main class="rd-map-explorer" :style="{ '--accent': city.accent }">
    <header class="rd-map-explorer__header">
      <div class="rd-map-explorer__title">
        <NuxtLink :to="`/${city.slug}`" class="rd-map-explorer__back" aria-label="Về trang thành phố">←</NuxtLink>
        <h1 class="section-title">Bản đồ {{ city.name }}</h1>
      </div>
      <form class="rd-map-explorer__filters" method="get" :action="`/${city.slug}/ban-do`" aria-label="Lọc danh mục" @submit="filter">
        <button type="submit" name="category" value="" class="rd-chip rd-chip--filter" :aria-pressed="!category">Tất cả</button>
        <button v-for="item in PlaceCategory.options" :key="item" type="submit" name="category" :value="item" class="rd-chip rd-chip--filter" :aria-pressed="category === item">{{ CATEGORY_LABEL[item] }}</button>
      </form>
    </header>

    <section class="rd-map-explorer__map" aria-label="Khung nhìn bản đồ">
      <ClientOnly>
        <RdPlaceMap :city="city" :places="places" :selected-slug="selectedSlug" @viewport="viewport" @select="select" />
        <template #fallback><div class="rd-map-explorer__placeholder"><p>Đang mở bản đồ…</p><noscript>Bật JavaScript để kéo bản đồ. Bạn vẫn xem được danh sách bên dưới.</noscript></div></template>
      </ClientOnly>
      <nav class="rd-map-explorer__attribution" aria-label="Nguồn bản đồ">
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
        <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
      </nav>
    </section>

    <section class="rd-map-explorer__sheet" :class="`rd-map-explorer__sheet--${sheetMode}`" aria-labelledby="map-places-title">
      <div class="rd-map-explorer__sheet-top">
        <h2 id="map-places-title" class="rd-map-explorer__count">{{ selected && sheetMode !== 'list' ? selected.name : `${places.length} địa điểm trong vùng` }}</h2>
        <div class="rd-map-explorer__sheet-actions">
          <button v-if="sheetMode !== 'compact'" type="button" class="rd-map-explorer__small-button" @click="sheetMode = 'compact'">Thu gọn</button>
          <button v-if="sheetMode !== 'list'" type="button" class="rd-map-explorer__small-button" @click="sheetMode = 'list'">Danh sách</button>
        </div>
      </div>
      <div v-show="sheetMode !== 'compact'" class="rd-map-explorer__content">
        <p v-if="loading" role="status" class="rd-map-explorer__status">Đang tìm địa điểm trong vùng…</p>
        <div v-if="loadFailed" role="status" class="rd-map-explorer__error">
          <p>Chưa tải được địa điểm trong vùng này. Bạn vẫn xem được các ghi chép đã tải.</p>
          <button class="rd-btn rd-btn--outline" type="button" @click="load">Thử lại</button>
        </div>
        <div v-if="selected && sheetMode === 'card'" class="rd-map-explorer__selected">
          <h3 ref="selectedHeading" tabindex="-1" class="visually-hidden">{{ selected.name }}</h3>
          <RdPlaceCard :place="selected" :href="`/${city.slug}/dia-diem/${selected.slug}`" :now="now" />
          <NuxtLink class="rd-btn" :to="`/${city.slug}/dia-diem/${selected.slug}`">Xem địa điểm</NuxtLink>
        </div>
        <ul v-else-if="places.length" class="rd-map-explorer__list">
          <li v-for="place in places" :key="place.slug">
            <RdPlaceCard :place="place" :href="`/${city.slug}/dia-diem/${place.slug}`" :now="now" />
            <button type="button" class="rd-map-explorer__small-button" :aria-label="`Xem ghim ${place.name}`" @click="select(place.slug)">Xem ghim</button>
          </li>
        </ul>
        <p v-else-if="!loading && !loadFailed" class="empty-note">Khu này mình chưa ghi chép chỗ nào{{ category ? ` thuộc danh mục ${CATEGORY_LABEL[category].toLowerCase()}` : '' }}. Thử kéo bản đồ sang bên cạnh nhé.</p>
        <noscript>Danh sách hiển thị tối đa 50 địa điểm đầu tiên. Bật JavaScript để tải thêm theo vùng đang xem.</noscript>
      </div>
    </section>
  </main>
</template>

<style scoped>
.rd-map-explorer { height: 100dvh; min-height: 540px; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(150px, 1fr) auto; background: var(--paper); overflow: hidden; }
.rd-map-explorer__header { min-width: 0; padding: var(--space-2) var(--space-3); background: var(--paper-raised); }
.rd-map-explorer__title { display: flex; align-items: center; gap: var(--space-2); }
.rd-map-explorer__title h1 { font-size: 20px; }
.rd-map-explorer__back { display: inline-flex; align-items: center; justify-content: center; min-width: var(--tap-min); min-height: var(--tap-min); font-size: 24px; text-decoration: none; }
.rd-map-explorer__filters { display: flex; gap: var(--space-2); overflow-x: auto; padding: var(--space-1) 0; }
.rd-map-explorer__filters button { flex-shrink: 0; font: inherit; cursor: pointer; }
.rd-map-explorer__map { position: relative; min-height: 0; display: flex; flex-direction: column; }
.rd-map-explorer__map > :first-child { flex: 1; min-height: 0; }
.rd-map-explorer__placeholder { background: var(--map-land); padding: var(--space-4); }
.rd-map-explorer__attribution { flex: 0 0 auto; padding: var(--space-1) var(--space-2); background: var(--paper-raised); font-size: 10px; text-align: right; line-height: 1.6; }
.rd-map-explorer__attribution a { display: inline; }
.rd-map-explorer__sheet { background: var(--paper-raised); border-top: var(--border-strong) solid var(--ink); border-radius: var(--radius-sheet) var(--radius-sheet) 0 0; padding: var(--space-2) var(--space-3) env(safe-area-inset-bottom, 0px); min-height: 0; }
.rd-map-explorer__sheet-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.rd-map-explorer__count { margin: 0; font-size: 14px; }
.rd-map-explorer__sheet-actions { display: flex; flex-shrink: 0; }
.rd-map-explorer__small-button { min-height: var(--tap-min); padding: var(--space-2); border: 0; background: transparent; color: var(--ink); text-decoration: underline; font: inherit; font-size: 13px; cursor: pointer; }
/* Chiều cao ổn định: dòng đang tải/rỗng/lỗi không resize bản đồ và phát moveend liên tục. */
.rd-map-explorer__content { height: 45dvh; overflow-y: auto; padding-bottom: var(--space-3); }
.rd-map-explorer__sheet--card .rd-map-explorer__content { height: 38dvh; }
.rd-map-explorer__list { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
.rd-map-explorer__list li { border-bottom: var(--border); padding-bottom: var(--space-1); }
.rd-map-explorer__list :deep(.rd-place) { height: auto; }
.rd-map-explorer__selected { display: grid; gap: var(--space-3); }
.rd-map-explorer__status { color: var(--ink-soft); font-size: 14px; }
.rd-map-explorer__error { padding: var(--space-3); background: var(--note); border-radius: var(--radius-note); margin-bottom: var(--space-3); font-size: 14px; }
.rd-map-explorer__error p { margin-top: 0; }
@media (min-width: 1024px) {
  .rd-map-explorer { grid-template-columns: minmax(330px, 400px) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); max-width: 1200px; margin: 0 auto; }
  .rd-map-explorer__header { grid-column: 1 / -1; }
  .rd-map-explorer__map { grid-column: 2; grid-row: 2; }
  .rd-map-explorer__sheet { grid-column: 1; grid-row: 2; border-radius: 0; border-top: 0; border-right: var(--border); display: flex; flex-direction: column; }
  .rd-map-explorer__content, .rd-map-explorer__sheet--card .rd-map-explorer__content { height: auto; flex: 1; }
  .rd-map-explorer__sheet-actions { display: none; }
  .rd-map-explorer__sheet--card .rd-map-explorer__sheet-actions, .rd-map-explorer__sheet--compact .rd-map-explorer__sheet-actions { display: flex; }
}
</style>
