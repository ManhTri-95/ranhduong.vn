<script setup lang="ts">
import { CATEGORY_LABEL, formatTripLength, PACE_LABEL, TRANSPORT_LABEL, type CityPublic, type ItineraryPublicStop, type ItineraryStopPlace, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component, type ShallowRef } from 'vue';
import { DESCRIPTION_PREVIEW_CHARS, daySpan, itinerarySummary, noteNeedsToggle, summaryLine } from '~/entities/itinerary/lib/itinerary-summary';
import { directionHref } from '~/entities/place/lib/place-detail';
import RdItineraryShare from '~/features/itinerary-share/ui/RdItineraryShare.vue';
import { observeTimelineMotion } from '~/shared/lib/scroll-motion';
import { actionBarMode, activeStopKey, dayOfStop, findStop, firstLocatedKey } from '../lib/active-stop';
import RdItineraryActionBar from './RdItineraryActionBar.vue';
import RdItineraryDayBar from './RdItineraryDayBar.vue';
import RdItineraryStopCarousel from './RdItineraryStopCarousel.vue';

const props = defineProps<{ itinerary: ItineraryTemplateDetail; city: CityPublic | null; citySlug: string; shareUrl: string }>();
const mapComponent: ShallowRef<Component | null> = shallowRef(null);
const mapComponentFailed = ref(false);
const selectedDay = ref(1);
const selectedKey = ref<string | null>(null);
const timeline = ref<HTMLElement | null>(null);
const aside = ref<HTMLElement | null>(null);
const wide = ref(false);
/** Điện thoại: xem theo Lịch (mặc định, có trong SSR) hoặc Bản đồ (chỉ client). */
const view = ref<'timeline' | 'map'>('timeline');
const activeKey = ref<string | null>(props.itinerary.days[0]?.stops[0]?.key ?? null);
const mounted = ref(false);
let media: MediaQueryList | undefined;
let asideObserver: IntersectionObserver | undefined;
let stopMotion = () => {};
function startMotion(): void {
  stopMotion();
  if (timeline.value) stopMotion = observeTimelineMotion(timeline.value);
}
const currentDay = computed(() => props.itinerary.days.find((day) => day.day === selectedDay.value) ?? props.itinerary.days[0]!);
const dayTabs = computed(() => props.itinerary.days.map((day) => ({ day: day.day, count: day.stops.length })));
const hasLocations = computed(() => currentDay.value.stops.some((stop) => stop.place?.location));
const summary = computed(() => summaryLine(itinerarySummary(props.itinerary.days)));
const descriptionLong = computed(() => noteNeedsToggle(props.itinerary.description, DESCRIPTION_PREVIEW_CHARS));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const categories = (place: ItineraryStopPlace) => [place.category, ...place.alsoCategories].map((category) => CATEGORY_LABEL[category]).join(', ');
const direction = (stop: ItineraryPublicStop) => stop.place ? directionHref({ ...stop.place, status: 'active' }) : undefined;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function ensureMap(): Promise<void> {
  if (mapComponent.value) return;
  mapComponentFailed.value = false;
  try { mapComponent.value = (await import('~/features/itinerary-map/ui/RdItineraryMap.client.vue')).default; }
  catch { mapComponentFailed.value = true; }
}
/** Vào chế độ Bản đồ: timeline bị ẩn làm trang ngắn lại, nên đưa khối bản đồ lên ngay dưới thanh ngày. */
async function revealMapView(focus = false): Promise<void> {
  await nextTick();
  document.querySelector('.rd-itinerary-detail__mapview')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  // Nút số vừa bấm nằm trong timeline đã bị ẩn: đưa focus sang tiêu đề bản đồ để bàn phím và trình đọc màn hình không mất chỗ.
  if (focus) document.getElementById('itinerary-mapview-title')?.focus({ preventScroll: true });
}
/**
 * Sau khi code tự cuộn (chọn ngày, quay lại Lịch, bấm ghim), giữ điểm người dùng vừa chọn trong lúc trang còn trôi,
 * để vạch 40% không đổi sang điểm khác ngay khi cuộn chưa dừng.
 */
let trackHoldUntil = 0;
function holdActive(key: string | null): void {
  if (key) activeKey.value = key;
  trackHoldUntil = performance.now() + 1200;
}
function selectKey(key: string): void {
  selectedKey.value = key;
  activeKey.value = key;
  selectedDay.value = dayOfStop(props.itinerary.days, key) ?? selectedDay.value;
}
function setView(next: 'timeline' | 'map'): void {
  if (next === view.value || (next === 'map' && !props.city)) return;
  view.value = next;
  if (next === 'map') {
    const current = findStop(props.itinerary.days, activeKey.value);
    selectedDay.value = dayOfStop(props.itinerary.days, activeKey.value) ?? selectedDay.value;
    selectedKey.value = current?.place?.location ? current.key : firstLocatedKey(currentDay.value.stops);
    void ensureMap();
    void revealMapView();
    return;
  }
  // Quay lại Lịch ở đúng điểm đang chọn trên bản đồ; đặt điểm ngay dưới thanh ngày (trên vạch 40%).
  const key = selectedKey.value ?? activeKey.value;
  holdActive(key);
  void nextTick(() => document.getElementById(`stop-${key}`)?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' }));
}
function chooseDay(day: number): void {
  selectedDay.value = day;
  const stops = props.itinerary.days.find((item) => item.day === day)?.stops ?? [];
  if (view.value === 'map' && !wide.value) { selectedKey.value = firstLocatedKey(stops); return; }
  selectedKey.value = null;
  holdActive(stops[0]?.key ?? null);
  document.getElementById(`day-${day}`)?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
}
async function showOnMap(day: number, key: string): Promise<void> {
  if (!props.city) return;
  selectedDay.value = day;
  selectKey(key);
  holdActive(key);
  void ensureMap();
  if (!wide.value) {
    view.value = 'map';
    await revealMapView(true);
  }
}
function reloadMap(): void { window.location.reload(); }
/** Desktop: bấm ghim trên bản đồ cột phải thì cuộn timeline tới điểm đó. */
async function selectStop(key: string): Promise<void> {
  selectKey(key);
  holdActive(key);
  await nextTick();
  const heading = document.getElementById(`stop-${key}`);
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
}
const focusStop = computed(() => findStop(props.itinerary.days, view.value === 'map' && !wide.value ? selectedKey.value : activeKey.value) ?? null);
const focusDay = computed(() => dayOfStop(props.itinerary.days, focusStop.value?.key ?? null) ?? selectedDay.value);
let frame = 0;
/** Điểm đang xem theo vạch 40% chiều cao màn hình; thanh ngày và thanh Chỉ đường đi theo. */
function track(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (!timeline.value || (view.value === 'map' && !wide.value) || performance.now() < trackHoldUntil) return;
    const rows = [...timeline.value.querySelectorAll<HTMLElement>('[data-rd-stop-key]')].map((element) => ({
      key: element.dataset.rdStopKey ?? '',
      top: element.querySelector('.rd-itinerary-stop__number')?.getBoundingClientRect().top ?? element.getBoundingClientRect().top,
    }));
    activeKey.value = activeStopKey(rows, window.innerHeight * 0.4);
    selectedDay.value = dayOfStop(props.itinerary.days, activeKey.value) ?? selectedDay.value;
  });
}
/** Điểm đang xem chưa có vị trí: mở bản đồ của ngày; ngày không có vị trí nào thì bản đồ hiện câu "Chưa có vị trí công khai". */
const barMode = computed(() => actionBarMode(focusStop.value, { mapVisible: wide.value || view.value === 'map', canShowMap: Boolean(props.city) }));
function showDayMap(): void {
  if (wide.value || !props.city) return;
  const key = firstLocatedKey(currentDay.value.stops);
  if (key) void showOnMap(focusDay.value, key);
  else setView('map');
}
function updateWide(): void { wide.value = media?.matches ?? false; }

onMounted(() => {
  mounted.value = true;
  startMotion();
  window.addEventListener('scroll', track, { passive: true });
  track();
  media = window.matchMedia('(min-width: 1024px)');
  updateWide();
  media.addEventListener('change', updateWide);
  // Desktop: cột bản đồ tự tải khi sắp vào màn hình, không cần bấm nút.
  if (aside.value && typeof IntersectionObserver === 'function') {
    asideObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && wide.value) { void ensureMap(); asideObserver?.disconnect(); }
    }, { rootMargin: '200px' });
    asideObserver.observe(aside.value);
  }
});
watch(() => props.itinerary.days, startMotion, { flush: 'post' });
onBeforeUnmount(() => { stopMotion(); window.removeEventListener('scroll', track); cancelAnimationFrame(frame); media?.removeEventListener('change', updateWide); asideObserver?.disconnect(); });
</script>

<template>
  <article class="rd-itinerary-detail">
    <header class="rd-itinerary-detail__intro">
      <p class="rd-itinerary-detail__eyebrow">Lịch trình · {{ formatTripLength(itinerary.days.length) }}</p>
      <h1 class="page-title">{{ itinerary.title }}</h1>
      <ul class="rd-itinerary-detail__chips" aria-label="Đặc điểm lịch trình">
        <li class="rd-chip">{{ capitalize(TRANSPORT_LABEL[itinerary.transport]) }}</li>
        <li class="rd-chip">{{ capitalize(PACE_LABEL[itinerary.pace]) }}</li>
        <li v-if="itinerary.season" class="rd-chip rd-chip--accent">{{ itinerary.season }}</li>
        <li v-if="itinerary.style" class="rd-chip">{{ itinerary.style }}</li>
      </ul>
      <p v-if="summary" class="rd-itinerary-detail__summary">{{ summary }}</p>
      <div v-if="itinerary.description" class="rd-itinerary-detail__description-wrap">
        <input v-if="descriptionLong" id="itinerary-description-more" type="checkbox" class="rd-more-toggle visually-hidden">
        <p :class="['rd-itinerary-detail__description', { 'rd-clamp rd-clamp--3': descriptionLong }]">{{ itinerary.description }}</p>
        <label v-if="descriptionLong" for="itinerary-description-more" class="rd-more-label"><span class="rd-more-label__open">Đọc thêm</span><span class="rd-more-label__close">Thu gọn</span></label>
      </div>
      <p class="rd-itinerary-detail__hint">Giờ ghé và thời gian di chuyển là dự kiến. Xem lại giờ mở cửa ở trang địa điểm trước khi đi nhé.</p>
    </header>

    <RdItineraryDayBar :days="dayTabs" :selected-day="selectedDay" :view="view" :show-toggle="mounted && !wide && Boolean(city)" @day="chooseDay" @view="setView" />

    <section v-if="mounted && !wide && view === 'map' && city" class="rd-itinerary-detail__mapview" aria-labelledby="itinerary-mapview-title">
      <h2 id="itinerary-mapview-title" class="visually-hidden" tabindex="-1">Bản đồ ngày {{ currentDay.day }}</h2>
      <div v-if="mapComponentFailed" role="status" class="rd-itinerary-detail__map-error">
        <p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p>
        <button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button>
      </div>
      <component :is="mapComponent" v-else-if="mapComponent && hasLocations" :city="city" :stops="currentDay.stops" :selected-key="selectedKey" @select="selectKey" />
      <p v-else-if="!hasLocations" class="empty-note">Chưa có vị trí công khai cho ngày này.</p>
      <div v-else class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div>
      <RdItineraryStopCarousel :stops="currentDay.stops" :selected-key="selectedKey" :city-slug="citySlug" @select="selectKey" />
      <nav class="rd-itinerary-detail__attribution" aria-label="Nguồn bản đồ">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> ·
        <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
        <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink>
      </nav>
    </section>

    <div class="rd-itinerary-detail__columns">
      <div v-show="!mounted || wide || view === 'timeline'" ref="timeline" class="rd-itinerary-detail__timeline">
        <section v-for="day in itinerary.days" :key="day.day" :aria-labelledby="`day-${day.day}`" class="rd-itinerary-day">
          <h2 :id="`day-${day.day}`" class="section-title">Ngày {{ day.day }} <span>{{ daySpan(day) ? `${daySpan(day)!.start} → ${daySpan(day)!.end} · ` : '' }}{{ day.stops.length }} điểm</span></h2>
          <ol v-if="day.stops.length" class="rd-itinerary-day__stops">
            <li v-for="(stop, index) in day.stops" :key="stop.key" class="rd-itinerary-stop" data-rd-motion-stop :data-rd-stop-key="stop.key" :class="{ 'rd-itinerary-stop--selected': selectedKey === stop.key, 'rd-itinerary-stop--last': index === day.stops.length - 1 }">
              <p v-if="index > 0 && stop.travelMinFromPrev > 0" class="rd-itinerary-stop__travel">{{ TRANSPORT_LABEL[itinerary.transport] }} · khoảng {{ stop.travelMinFromPrev }} phút</p>
              <div class="rd-itinerary-stop__row">
                <button v-if="stop.place?.location && city" type="button" class="rd-itinerary-stop__number" :aria-label="`Xem điểm ${stop.number} ngày ${day.day} trên bản đồ`" :aria-pressed="selectedKey === stop.key" @click="showOnMap(day.day, stop.key)"><span class="rd-itinerary-stop__number-graphic" aria-hidden="true">{{ stop.number }}</span></button>
                <span v-else class="rd-itinerary-stop__number" aria-hidden="true"><span class="rd-itinerary-stop__number-graphic">{{ stop.number }}</span></span>
                <div class="rd-itinerary-stop__body">
                  <p class="rd-itinerary-stop__time"><time>{{ stop.start }}</time>–<time>{{ stop.end }}</time><span v-if="stop.kind === 'meal'"> · Bữa ăn</span></p>
                  <div class="rd-itinerary-stop__head">
                    <h3 :id="`stop-${stop.key}`" tabindex="-1"><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
                    <a v-if="direction(stop)" :href="direction(stop)" class="rd-icon-btn rd-itinerary-stop__go" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
                    </a>
                  </div>
                  <template v-if="stop.place">
                    <p class="rd-itinerary-stop__meta">{{ categories(stop.place) }}<template v-if="stop.place.zoneName"> · {{ stop.place.zoneName }}</template></p>
                    <p v-if="stop.place.unconfirmed" class="rd-itinerary-stop__hint">Thông tin chưa được quán xác nhận</p>
                    <p v-if="!stop.place.location" class="rd-itinerary-stop__hint">Vị trí đang cập nhật</p>
                  </template>
                  <p v-else class="rd-itinerary-stop__hint">Chỗ này hiện chưa có thông tin công khai. Bạn chọn điểm khác trên bản đồ nhé.</p>
                  <div v-if="stop.note" class="rd-itinerary-stop__note-wrap">
                    <input v-if="noteNeedsToggle(stop.note)" :id="`note-${stop.key}`" type="checkbox" class="rd-more-toggle visually-hidden">
                    <p :class="['rd-itinerary-stop__note', { 'rd-clamp rd-clamp--2': noteNeedsToggle(stop.note) }]">{{ stop.note }}</p>
                    <label v-if="noteNeedsToggle(stop.note)" :for="`note-${stop.key}`" class="rd-more-label"><span class="rd-more-label__open">Xem thêm</span><span class="rd-more-label__close">Thu gọn</span></label>
                  </div>
                </div>
              </div>
            </li>
          </ol>
          <p v-else class="empty-note">Ngày này đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi nhé.</p>
        </section>
      </div>

      <aside v-if="city" ref="aside" class="rd-itinerary-detail__map" aria-labelledby="itinerary-map-title">
        <h2 id="itinerary-map-title" class="section-title" tabindex="-1">Đường ghé ngày {{ currentDay.day }}</h2>
        <p>Số trên bản đồ khớp các điểm trong ngày. Nét đứt nối thứ tự ghé, đường đi thực tế xem ở nút Chỉ đường.</p>
        <div v-if="mapComponentFailed" role="status">
          <p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p>
          <button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button>
        </div>
        <ClientOnly v-else>
          <component :is="mapComponent" v-if="mapComponent && wide" :city="city" :stops="currentDay.stops" :selected-key="selectedKey" @select="selectStop" />
          <div v-else class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div>
          <template #fallback><div class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div></template>
        </ClientOnly>
        <p v-if="!hasLocations" class="empty-note">Chưa có vị trí công khai cho ngày này.</p>
        <nav class="rd-itinerary-detail__attribution" aria-label="Nguồn bản đồ">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> ·
          <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
          <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink>
        </nav>
        <noscript>Bật JavaScript để mở bản đồ. Lịch giờ và nút Chỉ đường vẫn dùng được.</noscript>
        <RdItineraryActionBar v-if="mounted && wide" :stop="focusStop" :mode="barMode" :day="focusDay" :title="itinerary.title" :url="shareUrl" :fixed="false" @show-map="showDayMap" />
      </aside>
    </div>
    <RdItineraryShare :title="itinerary.title" :url="shareUrl" />
    <NuxtLink class="rd-itinerary-detail__map-link" :to="`/${citySlug}/ban-do`">Chọn thêm chỗ trên bản đồ thành phố →</NuxtLink>
    <RdItineraryActionBar v-if="mounted && !wide" :stop="focusStop" :mode="barMode" :day="focusDay" :title="itinerary.title" :url="shareUrl" fixed @show-map="showDayMap" />
  </article>
</template>

<style scoped>
.rd-itinerary-detail { display: grid; gap: var(--space-6); overflow-wrap: anywhere; }
.rd-itinerary-detail__intro { display: grid; gap: var(--space-3); max-width: 780px; }
.rd-itinerary-detail__intro p { margin: 0; }
.rd-itinerary-detail__eyebrow { color: var(--ink-soft); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 13px; }
.rd-itinerary-detail__chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-itinerary-detail__summary { font-weight: 600; }
.rd-itinerary-detail__description { white-space: pre-line; line-height: 1.7; }
.rd-itinerary-detail__hint { font-size: 13px; color: var(--ink-soft); line-height: 1.7; }
.rd-itinerary-detail__mapview { scroll-margin-top: var(--itinerary-daybar-h, 64px); display: grid; gap: var(--space-2); --itinerary-map-h: max(280px, 55dvh); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-itinerary-detail__mapview :deep(.rd-itinerary-map) { margin: 0 calc(-1 * var(--space-5)); }
.rd-itinerary-detail__map-error { padding: var(--space-3); background: var(--note); border-radius: var(--radius-note); }
.rd-itinerary-detail__map-error p { margin-top: 0; }
.rd-itinerary-detail__columns, .rd-itinerary-detail__timeline { display: grid; gap: var(--space-7); min-width: 0; }
.rd-itinerary-day { min-width: 0; }
.rd-itinerary-day h2 { scroll-margin-top: calc(var(--itinerary-daybar-h, 64px) + var(--space-3)); margin-bottom: var(--space-5); }
.rd-itinerary-day h2 span { color: var(--ink-soft); font: 400 13px var(--font-body); margin-left: var(--space-2); }
.rd-itinerary-day__stops { list-style: none; padding: 0; margin: 0; }
.rd-itinerary-stop { position: relative; padding-bottom: var(--space-5); }
.rd-itinerary-stop::before { content: ''; position: absolute; top: var(--stop-dot); bottom: 0; left: 21px; border-left: 2px dashed var(--line); transform-origin: top; }
.rd-itinerary-stop--last::before { display: none; }
.rd-itinerary-stop__row { display: flex; align-items: flex-start; gap: var(--space-3); }
.rd-itinerary-stop__number { position: relative; display: grid; flex: 0 0 var(--tap-min); width: var(--tap-min); min-height: var(--tap-min); padding: 0; border: 0; background: transparent; }
.rd-itinerary-stop__number-graphic { box-sizing: border-box; display: grid; place-items: center; width: var(--tap-min); height: var(--tap-min); border: var(--border-ink); border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); font: 700 18px var(--font-body); }
button.rd-itinerary-stop__number { cursor: pointer; }
.rd-itinerary-stop--last .rd-itinerary-stop__number-graphic, .rd-itinerary-stop--selected .rd-itinerary-stop__number-graphic { background: var(--accent); color: var(--ink); }
.rd-itinerary-stop[data-rd-motion-state='waiting'] .rd-itinerary-stop__number-graphic { transform: scale(0.4); opacity: 0; }
.rd-itinerary-stop[data-rd-motion-state='waiting']::before, .rd-itinerary-stop[data-rd-motion-state='marker']::before { transform: scaleY(0); }
.rd-itinerary-stop[data-rd-motion-state='marker'] .rd-itinerary-stop__number-graphic { animation: rd-stop-appear 400ms ease-out both; }
.rd-itinerary-stop[data-rd-motion-state='line']::before { animation: rd-stop-connect 600ms ease-out both; }
@keyframes rd-stop-appear {
  0% { transform: scale(0.4); opacity: 0; }
  70% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes rd-stop-connect { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .rd-itinerary-stop[data-rd-motion-state]::before, .rd-itinerary-stop[data-rd-motion-state] .rd-itinerary-stop__number-graphic { transform: none; opacity: 1; animation: none; }
}
.rd-itinerary-stop__body { flex: 1; min-width: 0; display: grid; gap: var(--space-1); }
.rd-itinerary-stop__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.rd-itinerary-stop__body h3 { margin: 0; font: 700 19px/1.4 var(--font-display); scroll-margin-top: calc(var(--itinerary-daybar-h, 64px) + var(--space-3)); }
.rd-itinerary-stop__body h3 a { display: inline-flex; min-height: var(--tap-min); align-items: center; text-decoration: none; }
.rd-itinerary-stop__body p { margin: 0; }
.rd-itinerary-stop__go { flex: 0 0 auto; border-color: var(--ink); }
.rd-itinerary-stop__go svg { width: 20px; height: 20px; }
.rd-itinerary-stop__time { font-size: 14px; font-weight: 600; }
.rd-itinerary-stop__meta, .rd-itinerary-stop__hint { font-size: 13px; color: var(--ink-soft); line-height: 1.6; }
.rd-itinerary-stop__note-wrap { margin-top: var(--space-1); }
.rd-itinerary-stop__note { white-space: pre-line; font: 400 15px/1.6 var(--font-body); }
.rd-itinerary-stop__travel { margin: 0 0 var(--space-3) calc(var(--tap-min) + var(--space-3)); color: var(--ink-soft); font-size: 13px; font-style: italic; }
.rd-itinerary-detail__map { display: none; gap: var(--space-3); align-content: start; min-width: 0; padding: var(--space-4); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.rd-itinerary-detail__map > p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
.rd-itinerary-detail__map-loading { height: var(--itinerary-map-h, 360px); background: var(--map-land); padding: var(--space-4); box-sizing: border-box; }
.rd-itinerary-detail__attribution { font-size: 11px; line-height: 1.7; }
.rd-itinerary-detail__map-link { justify-self: start; display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 13px; }
@media (min-width: 1024px) {
  .rd-itinerary-detail__columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: calc(var(--space-7) * 2); }
  .rd-itinerary-detail__map { display: grid; position: sticky; top: calc(var(--itinerary-daybar-h, 64px) + var(--space-3)); }
}
</style>
