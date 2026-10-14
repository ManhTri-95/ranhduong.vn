<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type BBox, type CityPublic, type PlaceCard, type PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchMapPlaces } from '~/entities/place/api/place-map';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { restorableView, type MapInsets, type MapView } from '~/shared/lib/map-camera';
import RdPlaceMap from '~/features/place-map/ui/RdPlaceMap.client.vue';
import { useApiBase } from '~/shared/api/client';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePlaceTracking } from '~/shared/lib/use-place-tracking';
import { resistDrag, settleSnap, sheetHeights, type SheetHeights, type SheetSnap } from '../lib/map-sheet';

const props = defineProps<{ city: CityPublic; initialPage: PlaceListResponse | null; category?: PlaceCategory; rainSafe: boolean; failed: boolean }>();
const emit = defineEmits<{ category: [value: PlaceCategory | undefined]; rainSafe: [value: boolean] }>();

/** Giữ khung nhìn, ghim đang chọn và mức sheet khi khách mở địa điểm rồi bấm Back (điều hướng trong app, không cần URL). */
interface MapSession { view?: MapView; selectedSlug: string | null; snap: SheetSnap; showing: 'list' | 'place'; listScroll: number }
const session = useState<MapSession>(`map-session:${props.city.slug}`, () => ({ selectedSlug: null, snap: 'half', showing: 'list', listScroll: 0 }));

const apiBase = useApiBase();
const now = useClientNow();
const places = ref<PlaceCard[]>(props.initialPage?.items ?? []);
const selectedSlug = ref<string | null>(session.value.selectedSlug);
const selected = computed(() => places.value.find((place) => place.slug === selectedSlug.value));
usePlaceTracking(() => selected.value?.id, 'map');
const showing = ref<'list' | 'place'>(session.value.showing);
const showingPlace = computed(() => showing.value === 'place' && Boolean(selected.value));
const loading = ref(false);
const loadFailed = ref(props.failed);
const selectedHeading = ref<HTMLElement | null>(null);
const initialView = restorableView(session.value.view, props.city.mapBounds);
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
    const result = await fetchMapPlaces(apiBase, props.city.slug, bounds, props.category, request.signal, props.rainSafe);
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

// ---- Bottom sheet (điện thoại): kéo theo tay, thả thì về mức gần nhất hoặc mức kế tiếp khi vuốt nhanh (ui-spec mục 4, 8).
const root = ref<HTMLElement | null>(null);
const header = ref<HTMLElement | null>(null);
const sheet = ref<HTMLElement | null>(null);
const sheetTop = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const snap = ref<SheetSnap>(session.value.snap);
const mobile = ref(false);
const insets = ref<MapInsets>({ top: 0, bottom: 0 });
let heights: SheetHeights | undefined;
let topHeight = 0;
let safeBottom = 0;
let media: MediaQueryList | undefined;
let resize: ResizeObserver | undefined;
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
  if (!mobile.value) {
    insets.value = { top: 0, bottom: 0 };
    return;
  }
  // Phần đầu sheet tính cả viền trên 2px, để danh sách kết thúc đúng mép dưới màn hình.
  topHeight = Math.round(sheetTop.value.getBoundingClientRect().bottom - sheet.value.getBoundingClientRect().top);
  safeBottom = Number.parseFloat(getComputedStyle(sheet.value).paddingBottom) || 0;
  heights = sheetHeights(el.clientHeight, header.value.offsetHeight, topHeight + safeBottom);
  el.style.setProperty('--map-header-h', `${header.value.offsetHeight}px`);
  el.style.setProperty('--sheet-h', `${heights.expanded}px`);
  settle(snap.value);
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
  if (event.target instanceof Element && event.target.closest('a, button:not(.rd-map-explorer__handle)')) return;
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
  if (showing.value === 'list' && content.value) session.value.listScroll = content.value.scrollTop;
  selectedSlug.value = slug;
  showing.value = 'place';
  if (mobile.value && (snap.value === 'collapsed' || (from === 'list' && snap.value === 'expanded'))) settle('half');
  await nextTick();
  if (content.value) content.value.scrollTop = 0;
  selectedHeading.value?.focus({ preventScroll: true });
}

async function showList(): Promise<void> {
  showing.value = 'list';
  await nextTick();
  if (content.value) content.value.scrollTop = session.value.listScroll;
  content.value?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
}

const sheetTitle = computed(() => {
  if (showingPlace.value && selected.value) return selected.value.name;
  return `${places.value.length} địa điểm trong vùng`;
});

watch(() => [props.category, props.rainSafe], () => { selectedSlug.value = null; showing.value = 'list'; places.value = []; void load(); });
watch(selectedSlug, (slug) => { session.value.selectedSlug = slug; if (!slug) showing.value = 'list'; });
watch(showing, (value) => { session.value.showing = value; });

onMounted(async () => {
  media = window.matchMedia('(max-width: 1023.98px)');
  media.addEventListener('change', layout);
  resize = new ResizeObserver(layout);
  if (root.value) resize.observe(root.value);
  layout();
  // Bật hiệu ứng trượt sau khung hình đầu, để sheet không trượt từ vị trí SSR sang mức đã lưu.
  requestAnimationFrame(() => root.value?.classList.add('rd-map-explorer--ready'));
  await load();
  await nextTick();
  if (showing.value === 'list' && content.value) content.value.scrollTop = session.value.listScroll;
});
onBeforeUnmount(() => {
  disposed = true;
  if (showing.value === 'list' && content.value) session.value.listScroll = content.value.scrollTop;
  controller?.abort();
  clearTimeout(timer);
  media?.removeEventListener('change', layout);
  resize?.disconnect();
});
</script>

<template>
  <main ref="root" class="rd-map-explorer" :data-snap="snap">
    <header ref="header" class="rd-map-explorer__header">
      <div class="rd-map-explorer__title">
        <NuxtLink :to="`/${city.slug}`" class="rd-map-explorer__back" aria-label="Về trang thành phố">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </NuxtLink>
        <h1 class="rd-map-explorer__heading">Bản đồ {{ city.name }}</h1>
      </div>
      <!-- Một hàng chip cuộn ngang; "Trú mưa được" đứng đầu để khi được chọn sẵn từ chế độ mưa vẫn luôn thấy. -->
      <div class="rd-map-explorer__filters">
        <form class="rd-map-explorer__form" method="get" :action="`/${city.slug}/ban-do`" aria-label="Lọc mái che" @submit.prevent="emit('rainSafe', !rainSafe)">
          <input v-if="category" type="hidden" name="category" :value="category">
          <button type="submit" name="rainSafe" :value="rainSafe ? 'false' : 'true'" class="rd-chip rd-chip--filter" :aria-pressed="rainSafe">Trú mưa được</button>
        </form>
        <span class="rd-map-explorer__divider" aria-hidden="true" />
        <form class="rd-map-explorer__form" method="get" :action="`/${city.slug}/ban-do`" aria-label="Lọc danh mục" @submit="filter">
          <input v-if="rainSafe" type="hidden" name="rainSafe" value="true">
          <button type="submit" name="category" value="" class="rd-chip rd-chip--filter" :aria-pressed="!category">Tất cả</button>
          <button v-for="item in PlaceCategory.options" :key="item" type="submit" name="category" :value="item" class="rd-chip rd-chip--filter" :aria-pressed="category === item">{{ CATEGORY_LABEL[item] }}</button>
        </form>
      </div>
    </header>

    <section class="rd-map-explorer__map" aria-label="Khung nhìn bản đồ">
      <ClientOnly>
        <RdPlaceMap :city="city" :places="places" :selected-slug="selectedSlug" :initial-view="initialView" :insets="insets" @viewport="viewport" @select="select" @camera="session.view = $event" />
        <template #fallback><div class="rd-map-explorer__placeholder"><p>Đang mở bản đồ…</p><noscript>Bật JavaScript để kéo bản đồ. Bạn vẫn xem được danh sách bên dưới.</noscript></div></template>
      </ClientOnly>
      <nav class="rd-map-explorer__attribution" aria-label="Nguồn bản đồ">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> ·
        <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
        <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink>
      </nav>
    </section>

    <section ref="sheet" class="rd-map-explorer__sheet" aria-labelledby="map-places-title">
      <div ref="sheetTop" class="rd-map-explorer__sheet-top" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd">
        <button type="button" class="rd-map-explorer__handle" :aria-label="handleLabel" @click="toggleSnap" @keydown="stepSnap"><span class="rd-map-explorer__grip" /></button>
        <div class="rd-map-explorer__sheet-head">
          <button v-if="showingPlace" type="button" class="rd-map-explorer__list-button" @click="showList">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            Danh sách
          </button>
          <h2 id="map-places-title" class="rd-map-explorer__count">{{ sheetTitle }}</h2>
        </div>
      </div>
      <div ref="content" class="rd-map-explorer__content" :inert="(mobile && snap === 'collapsed') || undefined">
        <p class="visually-hidden" role="status">{{ loading ? 'Đang tìm địa điểm trong vùng…' : '' }}</p>
        <div v-if="loadFailed" role="status" class="rd-map-explorer__error">
          <p>Chưa tải được địa điểm trong vùng này. Bạn vẫn xem được các ghi chép đã tải.</p>
          <button class="rd-btn rd-btn--outline" type="button" @click="load">Thử lại</button>
        </div>
        <div v-if="showingPlace && selected" class="rd-map-explorer__selected">
          <h3 ref="selectedHeading" tabindex="-1" class="visually-hidden">{{ selected.name }}</h3>
          <RdPlaceCard :place="selected" :href="`/${city.slug}/dia-diem/${selected.slug}`" :now="now" />
          <NuxtLink class="rd-btn rd-btn--primary" :to="`/${city.slug}/dia-diem/${selected.slug}`">Xem địa điểm</NuxtLink>
        </div>
        <ul v-else-if="places.length" class="rd-map-explorer__list" :aria-busy="loading">
          <li v-for="place in places" :key="place.slug" class="rd-map-explorer__item" :aria-current="place.slug === selectedSlug ? 'true' : undefined">
            <RdPlaceCard :place="place" :href="`/${city.slug}/dia-diem/${place.slug}`" :now="now" />
            <button type="button" class="rd-map-explorer__pin-button" :aria-label="`Xem ghim ${place.name} trên bản đồ`" @click="select(place.slug, 'list')">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            </button>
          </li>
        </ul>
        <ul v-else-if="loading" class="rd-map-explorer__list" aria-hidden="true">
          <li v-for="n in 3" :key="n" class="rd-place rd-map-explorer__skeleton"><span class="rd-skeleton rd-map-explorer__skeleton-thumb" /><span class="rd-map-explorer__skeleton-lines"><span class="rd-skeleton" /><span class="rd-skeleton" /></span></li>
        </ul>
        <p v-else-if="!loadFailed" class="empty-note rd-map-explorer__empty">Khu này mình chưa ghi chép chỗ nào{{ category ? ` thuộc danh mục ${CATEGORY_LABEL[category].toLowerCase()}` : '' }}{{ rainSafe ? ' trú mưa được' : '' }}. Thử kéo bản đồ sang bên cạnh hoặc bỏ bớt bộ lọc nhé.</p>
        <noscript>Danh sách hiển thị tối đa 50 địa điểm đầu tiên. Bật JavaScript để tải thêm theo vùng đang xem.</noscript>
        <slot name="footer" />
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Điện thoại: bản đồ chiếm trọn màn hình, header và sheet nổi phía trên (ui-spec mục 5). */
.rd-map-explorer {
  --map-header-h: 108px; --sheet-top: 80px;
  --sheet-h: calc(100dvh - var(--map-header-h) - 40px); --sheet-visible: 50dvh; --sheet-content-h: calc(50dvh - var(--sheet-top));
  --map-controls-top: var(--map-header-h);
  position: fixed; inset: 0; overflow: hidden; background: var(--map-land);
}
.rd-map-explorer__header { position: absolute; z-index: 3; top: 0; left: 0; right: 0; padding: var(--space-2) var(--space-3) var(--space-2); background: var(--paper-raised); border-bottom: var(--border); }
.rd-map-explorer__title { display: flex; align-items: center; gap: var(--space-1); }
.rd-map-explorer__heading { margin: 0; font: 700 19px/1.2 var(--font-display); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-map-explorer__back { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: var(--tap-min); height: var(--tap-min); margin-left: calc(-1 * var(--space-1)); border-radius: var(--radius-pill); color: var(--ink); }
.rd-map-explorer__back svg { width: 24px; height: 24px; }
.rd-map-explorer__filters { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) calc(-1 * var(--space-3)) 0; padding: 0 var(--space-3); overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
.rd-map-explorer__filters::-webkit-scrollbar { display: none; }
.rd-map-explorer__form { display: contents; }
.rd-map-explorer__filters button { flex-shrink: 0; font: inherit; cursor: pointer; }
.rd-map-explorer__divider { flex: 0 0 1.5px; align-self: stretch; margin: var(--space-2) 0; background: var(--line); }
.rd-map-explorer__map { position: absolute; inset: 0; }
.rd-map-explorer__map > :first-child { width: 100%; height: 100%; }
.rd-map-explorer__placeholder { height: 100%; box-sizing: border-box; padding: calc(var(--map-header-h) + var(--space-4)) var(--space-4) var(--space-4); background: var(--map-land); }
/* Ghi nguồn OSM luôn thấy, nằm ngay trên mép sheet và đi theo sheet bằng transform (ui-spec mục 6). */
.rd-map-explorer__attribution { position: absolute; z-index: 2; right: var(--space-2); bottom: var(--space-1); max-width: calc(100% - 2 * var(--space-2)); padding: 2px var(--space-2); border-radius: var(--radius-note); background: rgba(255, 253, 248, 0.92); font-size: 11px; line-height: 1.5; text-align: right; transform: translateY(calc(-1 * var(--sheet-visible))); }
.rd-map-explorer__attribution a { color: var(--ink); }

.rd-map-explorer__sheet {
  position: absolute; z-index: 4; left: 0; right: 0; bottom: 0; height: var(--sheet-h); box-sizing: border-box;
  display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--paper-raised); border-top: var(--border-strong) solid var(--ink); border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  transform: translateY(calc(var(--sheet-h) - var(--sheet-visible)));
}
.rd-map-explorer--ready .rd-map-explorer__sheet, .rd-map-explorer--ready .rd-map-explorer__attribution { transition: transform var(--dur-panel) var(--ease-out); }
.rd-map-explorer--dragging .rd-map-explorer__sheet, .rd-map-explorer--dragging .rd-map-explorer__attribution { transition: none; }
/* Vùng kéo: trình duyệt không cuộn trang khi kéo ở đây; bản đồ và danh sách vẫn xử lý cử chỉ riêng. */
.rd-map-explorer__sheet-top { flex: 0 0 auto; padding: 0 var(--space-3) var(--space-2); touch-action: none; cursor: grab; }
.rd-map-explorer--dragging .rd-map-explorer__sheet-top { cursor: grabbing; }
.rd-map-explorer__handle { display: flex; align-items: center; justify-content: center; width: 100%; height: 28px; padding: 0; border: 0; background: transparent; cursor: inherit; }
.rd-map-explorer__handle:focus-visible { outline: 3px solid var(--ink); outline-offset: -3px; border-radius: var(--radius-chip); }
.rd-map-explorer__grip { width: 44px; height: 5px; border-radius: var(--radius-pill); background: var(--line); }
.rd-map-explorer__sheet-head { display: flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); }
.rd-map-explorer__count { margin: 0; min-width: 0; font: 700 16px/1.3 var(--font-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-map-explorer__list-button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); padding: 0 var(--space-3) 0 var(--space-1); border: var(--border-hair) solid var(--line); border-radius: var(--radius-pill); background: var(--paper-raised); color: var(--ink); font: 600 14px var(--font-body); cursor: pointer; }
.rd-map-explorer__list-button svg { width: 18px; height: 18px; }
.rd-map-explorer__content { box-sizing: border-box; height: var(--sheet-content-h); overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--space-3) var(--space-3); touch-action: pan-y; }

.rd-map-explorer__list { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
.rd-map-explorer__item { position: relative; }
.rd-map-explorer__item :deep(.rd-place) { height: auto; }
.rd-map-explorer__item :deep(.rd-place__body) { padding-right: calc(var(--tap-min) - var(--space-2)); }
.rd-map-explorer__item[aria-current='true'] :deep(.rd-place) { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.rd-map-explorer__pin-button { position: absolute; top: var(--space-1); right: var(--space-1); display: inline-flex; align-items: center; justify-content: center; width: var(--tap-min); height: var(--tap-min); padding: 0; border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink); cursor: pointer; transition: scale var(--dur-micro) var(--ease-out); }
.rd-map-explorer__pin-button svg { width: 22px; height: 22px; }
.rd-map-explorer__pin-button:active { scale: 0.92; }
.rd-map-explorer__pin-button:focus-visible { outline: 3px solid var(--ink); outline-offset: -3px; }
.rd-map-explorer__selected { display: grid; gap: var(--space-3); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-map-explorer__skeleton { align-items: center; }
.rd-map-explorer__skeleton-thumb { flex: 0 0 var(--thumb); height: var(--thumb); }
.rd-map-explorer__skeleton-lines { flex: 1; display: grid; gap: var(--space-2); }
.rd-map-explorer__skeleton-lines .rd-skeleton { height: 14px; }
.rd-map-explorer__skeleton-lines .rd-skeleton + .rd-skeleton { width: 60%; }
.rd-map-explorer__error { padding: var(--space-3); background: var(--note); border-radius: var(--radius-note); margin-bottom: var(--space-3); font-size: 14px; }
.rd-map-explorer__error p { margin-top: 0; }
.rd-map-explorer__empty { padding: var(--space-2) 0; animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-map-explorer__content :deep(.rd-footer) { margin: var(--space-6) calc(-1 * var(--space-3)) 0; padding-bottom: var(--space-3); }

/* Desktop: danh sách cột trái, bản đồ cột phải, không có sheet kéo (ui-spec mục 5). */
@media (min-width: 1024px) {
  .rd-map-explorer { --map-controls-top: 0px; display: grid; grid-template-columns: minmax(330px, 400px) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); background: var(--paper); }
  .rd-map-explorer__header { position: static; grid-column: 1 / -1; padding: var(--space-2) var(--space-5); }
  .rd-map-explorer__filters { margin: var(--space-1) 0 0; padding: 0; flex-wrap: wrap; overflow: visible; }
  .rd-map-explorer__map { position: relative; inset: auto; grid-column: 2; grid-row: 2; }
  .rd-map-explorer__placeholder { padding-top: var(--space-4); }
  .rd-map-explorer__attribution, .rd-map-explorer--ready .rd-map-explorer__attribution { transform: none; transition: none; }
  .rd-map-explorer__sheet { position: static; grid-column: 1; grid-row: 2; height: auto; min-height: 0; transform: none; padding-bottom: 0; border-top: 0; border-right: var(--border); border-radius: 0; }
  .rd-map-explorer--ready .rd-map-explorer__sheet { transition: none; }
  .rd-map-explorer__sheet-top { padding: var(--space-2) var(--space-4); touch-action: auto; cursor: auto; }
  .rd-map-explorer__handle { display: none; }
  .rd-map-explorer__content { flex: 1; height: auto; min-height: 0; padding: 0 var(--space-4) var(--space-4); }
}
</style>
