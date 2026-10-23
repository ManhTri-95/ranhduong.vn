<script setup lang="ts">
import { type BBox, type CityPublic, type PlaceCard, type PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchMapPlaces } from '~/entities/place/api/place-map';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { mapFilterQuery, type MapFilters } from '~/entities/place/lib/map-query';
import { restorableView, viewportAction, type MapInsets, type MapView } from '~/shared/lib/map-camera';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdPlaceMap from '~/features/place-map/ui/RdPlaceMap.client.vue';
import { useApiBase } from '~/shared/api/client';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePlaceTracking } from '~/shared/lib/use-place-tracking';
import { resistDrag, settleSnap, sheetHeights, type SheetHeights, type SheetSnap } from '../lib/map-sheet';
import RdMapToolbar from './RdMapToolbar.vue';
import RdMapPostcard from './RdMapPostcard.vue';

const props = defineProps<{ city: CityPublic; initialPage: PlaceListResponse | null; filters: MapFilters; failed: boolean; focusedPlace?: PlaceCard | null; focusSlug?: string; focusRequested?: boolean; focusPending?: boolean }>();
const emit = defineEmits<{ filters: [value: MapFilters]; retryFocus: [] }>();

/** Giữ khung nhìn, ghim đang chọn và mức sheet khi khách mở địa điểm rồi bấm Back (điều hướng trong app, không cần URL). */
interface MapSession { view?: MapView; selectedSlug: string | null; snap: SheetSnap; showing: 'list' | 'place'; listScroll: number; filtersKey?: string; results?: PlaceCard[]; focusSlug?: string }
const session = useState<MapSession>(`map-session:${props.city.slug}`, () => ({ selectedSlug: null, snap: 'half', showing: 'list', listScroll: 0 }));
const filtersKey = computed(() => JSON.stringify(mapFilterQuery(props.filters.category, props.filters.rainSafe, props.filters)));
const listHref = computed(() => {
  const query = new URLSearchParams(mapFilterQuery(props.filters.category, props.filters.rainSafe, props.filters));
  return `/${props.city.slug}/ban-do${query.size ? `?${query}` : ''}`;
});
const hasFilters = computed(() => filtersKey.value !== '{}');
const restoring = session.value.filtersKey === filtersKey.value && session.value.focusSlug === props.focusSlug;

const apiBase = useApiBase();
const now = useClientNow();
const places = ref<PlaceCard[]>(restoring && session.value.results ? session.value.results : props.initialPage?.items ?? []);
const tags = ref(props.initialPage?.tags ?? []);
const selectedSlug = ref<string | null>(restoring ? session.value.selectedSlug : props.focusedPlace?.slug ?? null);
const focusKey = ref(0);
const mapPlaces = computed(() => props.focusedPlace && !places.value.some(place => place.slug === props.focusedPlace?.slug) ? [...places.value, props.focusedPlace] : places.value);
const selected = computed(() => mapPlaces.value.find((place) => place.slug === selectedSlug.value));
const selectedOutsideResults = computed(() => Boolean(selected.value && !places.value.some(place => place.slug === selectedSlug.value)));
usePlaceTracking(() => selected.value?.id, 'map');
const showing = ref<'list' | 'place'>(restoring ? session.value.showing : props.focusedPlace ? 'place' : 'list');
const showingPlace = computed(() => showing.value === 'place' && Boolean(selected.value));
const loading = ref(false);
const loadFailed = ref(props.failed);
const selectedHeading = ref<HTMLElement | null>(null);
const initialView = (restoring ? restorableView(session.value.view, props.city.mapBounds) : undefined)
  ?? (props.focusedPlace?.location ? { center: props.focusedPlace.location.coordinates, zoom: 14 } : undefined);
let appliedFocus = props.focusedPlace?.slug;
const mapReady = ref(false);
const mapFailed = ref(false);
const areaDirty = ref(false);
const editing = ref(false);
const hasMore = ref(!restoring && Boolean(props.initialPage?.nextCursor));
const searched = ref(false);
const resultCaption = computed(() => areaDirty.value ? 'Ghi chép của vùng đã tìm' : searched.value ? 'Trong khung nhìn đã tìm' : 'Ghi chép ban đầu của thành phố');
let bounds: BBox = props.city.mapBounds;
let searchedBounds: BBox | undefined;
let viewportInitialized = false;
let controller: AbortController | undefined;
let disposed = false;

async function load(): Promise<void> {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading.value = true;
  const trigger = document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute('data-rd-discovery-trigger') ? document.activeElement : undefined;
  const requestBounds: BBox = [...bounds];
  const requestFilters = filtersKey.value;
  try {
    const result = await fetchMapPlaces(apiBase, props.city.slug, requestBounds, props.filters, request.signal);
    if (disposed || controller !== request || request.signal.aborted || filtersKey.value !== requestFilters) return;
    const moveFocus = trigger && document.activeElement === trigger;
    places.value = result.places; tags.value = result.tags;
    session.value.results = result.places; session.value.filtersKey = requestFilters;
    searchedBounds = requestBounds; areaDirty.value = false; searched.value = true; hasMore.value = false;
    if (!result.places.some((place) => place.slug === selectedSlug.value) && selectedSlug.value !== props.focusedPlace?.slug) selectedSlug.value = null;
    loadFailed.value = false; loading.value = false;
    await nextTick();
    if (!disposed && moveFocus) document.getElementById('map-places-title')?.focus({ preventScroll: true });
  } catch {
    if (!disposed && controller === request && !request.signal.aborted) loadFailed.value = true;
  } finally {
    if (!disposed && controller === request) loading.value = false;
  }
}

function viewport(next: BBox, interactive: boolean): void {
  bounds = next;
  if (interactive) { controller?.abort(); controller = undefined; loading.value = false; }
  const action = viewportAction(viewportInitialized, interactive, searchedBounds, next);
  viewportInitialized = true;
  if (action === 'load') void load();
  else if (interactive) areaDirty.value = action === 'offer';
}
function onMapReady(): void { mapReady.value = true; mapFailed.value = false; viewportInitialized = false; }

// ---- Bottom sheet (điện thoại): kéo theo tay, thả thì về mức gần nhất hoặc mức kế tiếp khi vuốt nhanh (ui-spec mục 4, 8).
const root = ref<HTMLElement | null>(null);
const header = ref<HTMLElement | null>(null);
const sheet = ref<HTMLElement | null>(null);
const sheetTop = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const attribution = ref<HTMLElement | null>(null);
const snap = ref<SheetSnap>(!restoring && props.focusedPlace ? 'half' : session.value.snap);
const mobile = ref(false);
const insets = ref<MapInsets>({ top: 0, bottom: 0 });
let heights: SheetHeights | undefined;
let topHeight = 0;
let safeBottom = 0;
let media: MediaQueryList | undefined;
let resize: ResizeObserver | undefined;
let visual: VisualViewport | null | undefined;
let readyFrame: number | undefined;
let drag: { id: number; startY: number; startVisible: number; lastY: number; lastT: number; velocity: number; moved: boolean } | undefined;
let visible = 0;
/** Kéo bằng chuột vẫn phát click ngay sau khi thả; chỉ bỏ qua click trong khoảnh khắc đó, không giữ cờ cho lần bấm sau. */
let suppressClickUntil = 0;

function paint(height: number): void {
  visible = height;
  root.value?.style.setProperty('--sheet-visible', `${height}px`);
}

/** Đo lại khi đổi cỡ màn hình; danh sách chỉ đổi chiều cao khi sheet dừng, không đổi theo từng khung hình lúc kéo. */
function layout(): void {
  const el = root.value;
  if (!el || !header.value || !sheet.value || !sheetTop.value) return;
  mobile.value = media?.matches ?? false;
  el.classList.toggle('rd-map-explorer--compact', mobile.value && el.clientHeight < 500);
  el.style.setProperty('--map-header-h', `${header.value.offsetHeight}px`);
  if (!mobile.value) {
    insets.value = { top: 0, bottom: 0 };
    return;
  }
  // Phần đầu sheet tính cả viền trên 2px, để danh sách kết thúc đúng mép dưới màn hình.
  topHeight = Math.round(sheetTop.value.getBoundingClientRect().bottom - sheet.value.getBoundingClientRect().top);
  safeBottom = Number.parseFloat(getComputedStyle(sheet.value).paddingBottom) || 0;
  heights = sheetHeights(el.clientHeight, header.value.offsetHeight, topHeight + safeBottom, Math.max(56, (attribution.value?.offsetHeight ?? 0) + 8));
  el.style.setProperty('--sheet-h', `${heights.expanded}px`);
  settle(snap.value);
}

function viewportResize(): void {
  if (visual && visual.scale === 1) root.value?.style.setProperty('--map-viewport-h', `${visual.height}px`);
  else root.value?.style.removeProperty('--map-viewport-h');
  layout();
}

function settle(next: SheetSnap): void {
  snap.value = next;
  session.value.snap = next;
  if (!heights || !root.value) return;
  paint(heights[next]);
  root.value.style.setProperty('--sheet-content-h', `${Math.max(heights[next] - topHeight - safeBottom, 0)}px`);
  insets.value = { top: header.value?.offsetHeight ?? 0, bottom: heights[next] };
}

function dragStart(event: PointerEvent): void {
  if (!mobile.value || !heights || event.button !== 0) return;
  if (event.target instanceof Element && event.target.closest('a, input, select, summary, button:not(.rd-map-explorer__handle)')) return;
  drag = { id: event.pointerId, startY: event.clientY, startVisible: visible, lastY: event.clientY, lastT: event.timeStamp, velocity: 0, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function dragMove(event: PointerEvent): void {
  if (!drag || !heights || event.pointerId !== drag.id) return;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.abs(dy) < 4) return;
  if (!drag.moved) root.value?.classList.add('rd-map-explorer--dragging');
  drag.moved = true;
  const dt = event.timeStamp - drag.lastT;
  // Vận tốc dương khi kéo lên; làm mượt để một khung hình giật không đổi hướng thả.
  if (dt > 0) drag.velocity = 0.8 * ((drag.lastY - event.clientY) / dt) + 0.2 * drag.velocity;
  drag.lastY = event.clientY;
  drag.lastT = event.timeStamp;
  paint(resistDrag(drag.startVisible - dy, heights));
}

function dragEnd(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.id) return;
  const { moved, lastT } = drag;
  // Giữ yên ngón tay trước khi thả thì coi như không vuốt.
  const velocity = event.timeStamp - lastT > 80 ? 0 : drag.velocity;
  drag = undefined;
  root.value?.classList.remove('rd-map-explorer--dragging');
  if (!moved || !heights) return;
  suppressClickUntil = event.timeStamp + 350;
  settle(event.type === 'pointercancel' ? snap.value : settleSnap(visible, velocity, heights));
}

const NEXT_SNAP: Record<SheetSnap, SheetSnap> = { collapsed: 'half', half: 'expanded', expanded: 'collapsed' };
const handleLabel = computed(() => ({ collapsed: 'Mở danh sách địa điểm', half: 'Mở rộng danh sách địa điểm', expanded: 'Thu gọn danh sách địa điểm' })[snap.value]);
function toggleSnap(event: MouseEvent): void {
  if (event.timeStamp < suppressClickUntil) return;
  settle(NEXT_SNAP[snap.value]);
}
function stepSnap(event: KeyboardEvent): void {
  const order: SheetSnap[] = ['collapsed', 'half', 'expanded'];
  const index = order.indexOf(snap.value);
  const next = event.key === 'ArrowUp' ? order[index + 1] : event.key === 'ArrowDown' ? order[index - 1] : undefined;
  if (!next) return;
  event.preventDefault();
  settle(next);
}

// ---- Chọn địa điểm: từ ghim hoặc từ danh sách; thẻ hiện trong sheet, bản đồ chỉ dịch khi ghim bị che.
async function select(slug: string, from: 'map' | 'list' = 'map'): Promise<void> {
  if (!mapPlaces.value.some(place => place.slug === slug)) return;
  if (showing.value === 'list' && content.value) session.value.listScroll = content.value.scrollTop;
  selectedSlug.value = slug;
  focusKey.value++;
  showing.value = 'place';
  if (mobile.value && (snap.value === 'collapsed' || (from === 'list' && snap.value === 'expanded'))) settle('half');
  await nextTick();
  if (disposed) return;
  if (content.value) content.value.scrollTop = 0;
  selectedHeading.value?.focus({ preventScroll: true });
}

async function showList(): Promise<void> {
  showing.value = 'list';
  await nextTick();
  if (content.value) content.value.scrollTop = session.value.listScroll;
  const button = content.value?.querySelector<HTMLElement>('[aria-current="true"] button');
  button?.scrollIntoView({ block: 'nearest' }); button?.focus({ preventScroll: true });
}
function showListFromLink(event: MouseEvent): void {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void showList();
}

async function openResults(event: MouseEvent): Promise<void> {
  event.preventDefault(); settle('expanded'); await nextTick();
  document.getElementById('map-places-title')?.focus({ preventScroll: true });
}

const sheetTitle = computed(() => {
  if (showingPlace.value && selected.value) return selected.value.name;
  if (loadFailed.value && !loading.value && !places.value.length) return 'Chưa tải được địa điểm';
  return loading.value && !places.value.length ? 'Đang tìm địa điểm…' : `${places.value.length}${hasMore.value ? '+' : ''} địa điểm`;
});

watch(filtersKey, () => { selectedSlug.value = null; showing.value = 'list'; places.value = []; session.value.listScroll = 0; hasMore.value = false; loadFailed.value = false; void load(); });
watch(() => props.focusedPlace, (place) => {
  if (place && place.slug !== appliedFocus) {
    appliedFocus = place.slug; selectedSlug.value = place.slug; showing.value = 'place'; focusKey.value++;
    if (mobile.value && snap.value !== 'half') settle('half');
  }
});
watch(() => props.focusSlug, (slug, previous) => {
  session.value.focusSlug = slug;
  if (slug !== previous) appliedFocus = undefined;
  if (selectedSlug.value === previous && !props.focusedPlace) { selectedSlug.value = null; showing.value = 'list'; }
});
watch(selectedSlug, (slug) => { session.value.selectedSlug = slug; if (!slug) showing.value = 'list'; }, { immediate: true });
watch(showing, (value) => { session.value.showing = value; }, { immediate: true });

onMounted(async () => {
  session.value.focusSlug = props.focusSlug;
  media = window.matchMedia('(max-width: 1023.98px)');
  media.addEventListener('change', layout);
  resize = new ResizeObserver(layout);
  if (root.value) resize.observe(root.value);
  if (header.value) resize.observe(header.value);
  if (sheetTop.value) resize.observe(sheetTop.value);
  if (attribution.value) resize.observe(attribution.value);
  visual = window.visualViewport;
  visual?.addEventListener('resize', viewportResize);
  viewportResize();
  layout();
  // Bật hiệu ứng trượt sau khung hình đầu, để sheet không trượt từ vị trí SSR sang mức đã lưu.
  readyFrame = requestAnimationFrame(() => root.value?.classList.add('rd-map-explorer--ready'));
  await nextTick();
  if (showing.value === 'list' && content.value) content.value.scrollTop = session.value.listScroll;
});
onBeforeUnmount(() => {
  disposed = true;
  if (showing.value === 'list' && content.value) session.value.listScroll = content.value.scrollTop;
  controller?.abort();
  if (readyFrame !== undefined) cancelAnimationFrame(readyFrame);
  visual?.removeEventListener('resize', viewportResize);
  media?.removeEventListener('change', layout);
  resize?.disconnect();
});
</script>

<template>
  <main ref="root" class="rd-map-explorer" :class="{ 'rd-map-explorer--editing': editing }" :data-snap="snap">
    <a class="rd-map-explorer__skip" href="#map-places-title" @click="openResults">Đến danh sách địa điểm</a>
    <header ref="header" class="rd-map-explorer__header"><RdMapToolbar :city="city" :filters="filters" :tags="tags" @filters="emit('filters', $event)" @editing="editing = $event" /></header>
    <section class="rd-map-explorer__map" aria-label="Khung nhìn bản đồ">
      <ClientOnly>
        <RdPlaceMap :city="city" :places="mapPlaces" :selected-slug="selectedSlug" :initial-view="initialView" :focus-initial-selection="Boolean(focusedPlace && !restoring)" :insets="insets" :focus-key="focusKey" fit-initial-places journal @viewport="viewport" @select="select" @camera="session.view = $event" @ready="onMapReady" @error="mapFailed = true" />
        <template #fallback><div class="rd-map-explorer__placeholder"><RdCompass /><p>Đang mở bản đồ…</p><span>Mỗi ghim, một nơi để khám phá.</span><noscript>Bật JavaScript để kéo bản đồ. Bạn vẫn xem được danh sách bên dưới.</noscript></div></template>
      </ClientOnly>
      <div v-if="mapReady && !mapFailed" class="rd-map-explorer__orientation" aria-label="Bản đồ luôn hướng Bắc"><RdCompass north /><span>BẮC ↑</span></div>
      <nav class="rd-map-explorer__city-links" aria-label="Khám phá thành phố"><NuxtLink :to="'/' + city.slug">Cẩm nang thành phố ↗</NuxtLink><NuxtLink :to="'/' + city.slug + '#lich-trinh'">Lịch trình gợi ý ↗</NuxtLink></nav>
      <div v-if="areaDirty" class="rd-map-explorer__search-area"><button type="button" class="rd-btn rd-btn--primary" :aria-disabled="loading" data-rd-discovery-trigger @click="!loading && load()"><RdCompass />{{ loading ? 'Đang tìm trong vùng…' : 'Tìm trong khu vực này' }}</button><p v-if="!loading">Danh sách vẫn giữ vùng đã tìm trước đó.</p></div>
      <nav ref="attribution" class="rd-map-explorer__attribution" aria-label="Nguồn bản đồ"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a><span aria-hidden="true">·</span><a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a><span aria-hidden="true">·</span><a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a><span aria-hidden="true">·</span><NuxtLink to="/ghi-nguon#ban-do">Nguồn</NuxtLink></nav>
    </section>
    <section ref="sheet" class="rd-map-explorer__sheet" aria-labelledby="map-places-title">
      <div ref="sheetTop" class="rd-map-explorer__sheet-top" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd">
        <button type="button" class="rd-map-explorer__handle" :aria-label="handleLabel" :aria-expanded="snap !== 'collapsed'" aria-controls="map-results" @click="toggleSnap" @keydown="stepSnap"><span class="rd-map-explorer__grip" /></button>
        <div class="rd-map-explorer__sheet-tools"><span class="rd-map-explorer__folio">GHI CHÉP KHÁM PHÁ / {{ city.name }}</span><div class="rd-map-explorer__snap-controls" role="group" aria-label="Chiều cao danh sách"><button type="button" :aria-pressed="snap === 'collapsed'" @click="settle('collapsed')">Bản đồ</button><button type="button" :aria-pressed="snap === 'half'" @click="settle('half')">Nửa màn</button><button type="button" :aria-pressed="snap === 'expanded'" @click="settle('expanded')">Danh sách</button></div></div>
        <div class="rd-map-explorer__sheet-head"><a v-if="showingPlace" :href="listHref" class="rd-map-explorer__list-button" @click="showListFromLink">← Danh sách</a><div><p class="rd-map-explorer__result-caption">{{ showingPlace ? 'MỘT NƠI VỪA MỞ TRÊN BẢN ĐỒ' : resultCaption }}</p><h2 id="map-places-title" tabindex="-1" class="rd-map-explorer__count">{{ sheetTitle }}</h2></div><span class="rd-map-explorer__count-mark" aria-hidden="true">⌖</span></div>
      </div>
      <div id="map-results" ref="content" class="rd-map-explorer__content" :inert="(mobile && snap === 'collapsed') || undefined" :aria-busy="loading">
        <div v-if="focusRequested && !focusedPlace" class="rd-map-explorer__error" role="status"><p>{{ focusPending ? 'Đang tìm vị trí địa điểm…' : 'Chưa có vị trí để mở cho địa điểm này. Bạn vẫn có thể khám phá các nơi trong danh sách.' }}</p><button v-if="!focusPending" type="button" class="rd-btn rd-btn--outline" @click="emit('retryFocus')">Thử tải lại địa điểm</button></div>
        <button v-if="areaDirty" type="button" class="rd-btn rd-btn--primary rd-map-explorer__search-inline" :aria-disabled="loading" data-rd-discovery-trigger @click="!loading && load()">{{ loading ? 'Đang tìm trong vùng…' : 'Tìm trong khu vực mới' }}</button>
        <p class="rd-map-explorer__load-status" role="status" aria-live="polite">{{ loading ? 'Đang tìm địa điểm trong vùng…' : filters.q && places.length === 50 ? 'Tối đa 50 kết quả tìm kiếm trong vùng. Thu hẹp từ khóa hoặc bộ lọc để tìm tiếp nhé.' : '' }}</p>
        <div v-if="loadFailed" role="status" class="rd-map-explorer__error"><p>{{ loading ? 'Đang thử tải lại địa điểm…' : 'Chưa tải được địa điểm trong vùng này. Bạn vẫn xem được các ghi chép đã tải.' }}</p><button class="rd-btn rd-btn--outline" type="button" :aria-disabled="loading" data-rd-discovery-trigger @click="!loading && load()">Thử lại</button></div>
        <div v-if="showingPlace && selected" :key="selected.slug" class="rd-map-explorer__selected"><h3 ref="selectedHeading" tabindex="-1" class="visually-hidden">{{ selected.name }}</h3><p v-if="selectedOutsideResults" class="rd-map-explorer__load-status">Địa điểm bạn vừa mở nằm ngoài kết quả đang lọc trong vùng này.</p><RdMapPostcard :place="selected" :city-slug="city.slug" :now="now" /></div>
        <ul v-else-if="places.length" class="rd-map-explorer__list"><li v-for="(place, index) in places" :key="place.slug" class="rd-map-explorer__item" :aria-current="place.slug === selectedSlug ? 'true' : undefined"><span class="rd-map-explorer__item-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><RdPlaceCard :place="place" :href="'/' + city.slug + '/dia-diem/' + place.slug" :now="now" compact /><button v-if="place.location" type="button" class="rd-map-explorer__pin-button" :aria-label="'Xem ghim ' + place.name + ' trên bản đồ'" :aria-pressed="place.slug === selectedSlug" @click="select(place.slug, 'list')"><span aria-hidden="true">⌖</span></button></li></ul>
        <ul v-else-if="loading" class="rd-map-explorer__list" aria-hidden="true"><li v-for="n in 3" :key="n" class="rd-place rd-map-explorer__skeleton"><span class="rd-skeleton rd-map-explorer__skeleton-thumb" /><span class="rd-map-explorer__skeleton-lines"><span class="rd-skeleton" /><span class="rd-skeleton" /></span></li></ul>
        <div v-else-if="!loadFailed" class="rd-map-explorer__empty"><RdCompass /><h3>Chưa gặp nơi hợp gu?</h3><p>Khu này mình chưa có ghi chép phù hợp. Thử kéo bản đồ sang bên cạnh hoặc bỏ bớt bộ lọc nhé.</p><a v-if="hasFilters" :href="'/' + city.slug + '/ban-do'" @click.prevent="emit('filters', { rainSafe: false, tags: [] })">Xóa bộ lọc ↗</a><NuxtLink v-else :to="'/' + city.slug">Khám phá thành phố ↗</NuxtLink></div>
        <button v-if="mapFailed && hasMore" class="rd-btn rd-btn--outline rd-map-explorer__fallback-load" type="button" :aria-disabled="loading" data-rd-discovery-trigger @click="!loading && load()">Tải tiếp danh sách địa điểm</button>
        <p class="rd-map-explorer__journal-note">Rẽ một chút. Hay cả chuyến đi.</p><noscript>Danh sách hiển thị tối đa 50 địa điểm đầu tiên. Bật JavaScript để tải thêm theo vùng đang xem.</noscript><slot name="footer" />
      </div>
    </section>
  </main>
</template>

<style src="../../../assets/living-map.css"></style>
