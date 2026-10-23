<script setup lang="ts">
import { TRANSPORT_LABEL, type CityPublic, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component, type ShallowRef } from 'vue';
import { atlasDays, atlasSelection } from '~/entities/itinerary/lib/journey-atlas';
import { daySpan } from '~/entities/itinerary/lib/itinerary-summary';
import RdItineraryShare from '~/features/itinerary-share/ui/RdItineraryShare.vue';
import RdTicketPreview from '~/features/itinerary-ticket/ui/RdTicketPreview.vue';
import { observeLivingRoute } from '~/shared/lib/living-route';
import RdCompass from '~/shared/ui/RdCompass.vue';
import { actionBarMode } from '../lib/active-stop';
import RdItineraryActionBar from './RdItineraryActionBar.vue';
import RdItineraryDayBar from './RdItineraryDayBar.vue';
import RdItineraryStopCarousel from './RdItineraryStopCarousel.vue';
import RdJourneyCover from './RdJourneyCover.vue';
import RdJourneyOverview from './RdJourneyOverview.vue';
import RdJourneyStopCard from './RdJourneyStopCard.vue';

const props = defineProps<{ itinerary: ItineraryTemplateDetail; city: CityPublic | null; citySlug: string; shareUrl: string; ticket?: { url: string; fileName: string } }>();
const days = computed(() => atlasDays(props.itinerary.days));
const requestedSelection = ref(atlasSelection(days.value, days.value[0]?.day ?? 1, null));
const selection = computed(() => atlasSelection(days.value, requestedSelection.value.day, requestedSelection.value.key));
const currentDay = computed(() => days.value.find(day => day.day === selection.value.day) ?? { day: selection.value.day, stops: [] });
const focusStop = computed(() => currentDay.value.stops.find(stop => stop.key === selection.value.key) ?? null);
const dayTabs = computed(() => days.value.map(day => ({ day: day.day, count: day.stops.length })));
const hasLocations = computed(() => currentDay.value.stops.some(stop => stop.place?.location));
const anyLocations = computed(() => days.value.some(day => day.stops.some(stop => stop.place?.location)));
const ticketOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const chapters = ref<HTMLElement | null>(null);
const aside = ref<HTMLElement | null>(null);
const mapDialog = ref<HTMLDialogElement | null>(null);
const mapComponent: ShallowRef<Component | null> = shallowRef(null);
const mapComponentFailed = ref(false);
const mounted = ref(false);
const wide = ref(false);
const view = ref<'timeline' | 'map'>('timeline');
const focusRequest = ref(0);
const mobileMap = computed(() => mounted.value && !wide.value && view.value === 'map');
const barMode = computed(() => actionBarMode(focusStop.value, { mapVisible: wide.value || mobileMap.value, canShowMap: Boolean(props.city) }));
let media: MediaQueryList | undefined;
let observer: IntersectionObserver | undefined;
let mapVisible = false;
let disposed = false;
let mapLoading: Promise<void> | undefined;
let stopMotion = () => {};
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensureMap(): Promise<void> {
  if (!props.city || !anyLocations.value || mapComponent.value) return Promise.resolve();
  if (mapLoading) return mapLoading;
  mapComponentFailed.value = false;
  mapLoading = import('~/features/itinerary-map/ui/RdItineraryMap.client.vue').then(module => {
    if (!disposed) mapComponent.value = module.default;
  }).catch(() => { if (!disposed) mapComponentFailed.value = true; }).finally(() => { mapLoading = undefined; });
  return mapLoading;
}

function rememberDay(): void {
  // A fragment restores the chapter on reload without creating another canonical URL.
  history.replaceState(history.state, '', `#day-${selection.value.day}`);
}
function readHash(): void {
  const hash = window.location.hash;
  const day = days.value.find(item => `#day-${item.day}` === hash || item.stops.some(stop => `#stop-${stop.key}` === hash));
  if (day) {
    requestedSelection.value = atlasSelection(days.value, day.day, day.stops.find(stop => `#stop-${stop.key}` === hash)?.key ?? null);
    void nextTick(() => {
      if (!disposed && !mobileMap.value) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
}
async function chooseDay(day: number): Promise<void> {
  requestedSelection.value = atlasSelection(days.value, day, null);
  rememberDay();
  await nextTick();
  if (!disposed && !mobileMap.value) {
    document.getElementById(`day-${selection.value.day}`)?.focus({ preventScroll: true });
    chapters.value?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
  }
}
function selectKey(key: string): void {
  if (!currentDay.value.stops.some(stop => stop.key === key)) return;
  requestedSelection.value = { day: selection.value.day, key };
  focusRequest.value++;
}
async function selectFromMap(key: string): Promise<void> {
  selectKey(key);
  if (!wide.value) return;
  await nextTick();
  const heading = document.getElementById(`stop-${key}`);
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
}
function updateDialog(): void {
  const dialog = mapDialog.value;
  if (!dialog || !mounted.value) return;
  if (wide.value) {
    if (dialog.matches(':modal')) dialog.close();
    // Attribute-based nonmodal opening avoids show() autofocus/scroll on page load.
    dialog.open = true;
  } else if (mobileMap.value) {
    if (dialog.open && !dialog.matches(':modal')) dialog.close();
    if (!dialog.open) dialog.showModal();
  } else if (dialog.open) dialog.close();
}
async function setView(next: 'timeline' | 'map'): Promise<void> {
  if (next === 'map' && !props.city) return;
  view.value = next;
  if (next === 'map') void ensureMap();
  await nextTick();
  updateDialog();
  if (next === 'timeline' && !wide.value) {
    const heading = document.getElementById(`stop-${selection.value.key}`) ?? document.getElementById(`day-${selection.value.day}`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
  }
}
function showOnMap(key?: string): void {
  if (key) selectKey(key);
  if (!props.city) return;
  void ensureMap();
  if (!wide.value) void setView('map');
}
function updateWide(): void { wide.value = media?.matches ?? false; }
function reloadMap(): void { window.location.reload(); }
function startMotion(): void {
  stopMotion();
  if (root.value) stopMotion = observeLivingRoute(root.value);
}

watch(wide, async () => {
  await nextTick(); updateDialog();
  if (wide.value && mapVisible) void ensureMap();
});
watch(() => props.itinerary.days, () => {
  requestedSelection.value = atlasSelection(days.value, selection.value.day, selection.value.key);
  startMotion();
}, { flush: 'post' });
useHead(() => ({ bodyAttrs: { 'data-rd-atlas-map': mobileMap.value ? 'open' : undefined } }));
onMounted(() => {
  mounted.value = true;
  readHash();
  window.addEventListener('hashchange', readHash);
  media = window.matchMedia('(min-width: 1024px)');
  updateWide(); media.addEventListener('change', updateWide);
  updateDialog(); startMotion();
  if (aside.value && typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(([entry]) => {
      mapVisible = Boolean(entry?.isIntersecting);
      if (mapVisible && wide.value) void ensureMap();
    }, { rootMargin: '160px' });
    observer.observe(aside.value);
  }
});
onBeforeUnmount(() => {
  disposed = true; stopMotion(); observer?.disconnect();
  window.removeEventListener('hashchange', readHash); media?.removeEventListener('change', updateWide);
  if (mapDialog.value?.open) mapDialog.value.close();
});
</script>

<template>
  <article ref="root" class="rd-itinerary-detail rd-atlas">
    <RdJourneyCover :itinerary="itinerary" :city-name="city?.name ?? citySlug" :city-slug="citySlug" />
    <div class="rd-atlas-share">
      <p class="rd-atlas-share__annotation">Một hành trình hay,<br><span>có bạn càng vui.</span></p>
      <RdItineraryShare :title="itinerary.title" :url="shareUrl">
        <a v-if="ticket" class="rd-btn rd-btn--dashed" :href="ticket.url" @click.prevent="ticketOpen = true">Tạo vé để chia sẻ <span aria-hidden="true">↗</span></a>
      </RdItineraryShare>
    </div>
    <RdJourneyOverview :days="days" :selected-day="selection.day" @day="chooseDay" />

    <div id="journey-chapters" ref="chapters" class="rd-atlas-chapters">
      <RdItineraryDayBar :days="dayTabs" :selected-day="selection.day" :view="view" :show-toggle="mounted && !wide && Boolean(city)" @day="chooseDay" @view="setView" />
      <div class="rd-atlas-columns">
        <div class="rd-atlas-timeline">
          <section v-for="day in days" v-show="!mounted || day.day === selection.day" :key="day.day" class="rd-atlas-day" :aria-labelledby="`day-${day.day}`">
            <header class="rd-atlas-day__heading"><div><p class="rd-atlas-eyebrow">Mở một chương mới</p><h2 :id="`day-${day.day}`" tabindex="-1">Ngày <span>{{ String(day.day).padStart(2, '0') }}</span></h2></div><p>{{ day.stops.length }} điểm dừng<br><span v-if="daySpan(day)">{{ daySpan(day)!.start }} → {{ daySpan(day)!.end }}</span></p></header>
            <p class="rd-atlas-day__hint">Giờ ghé và thời gian di chuyển là dự kiến. Xem lại giờ mở cửa ở trang địa điểm trước khi đi nhé.</p>
            <ol v-if="day.stops.length" class="rd-atlas-stops">
              <RdJourneyStopCard v-for="(stop, index) in day.stops" :key="stop.key" :stop="stop" :day="day.day" :city-slug="citySlug" :selected="selection.key === stop.key" :can-map="Boolean(city)" :last="index === day.stops.length - 1" :transport="TRANSPORT_LABEL[itinerary.transport]" @select="selectKey" @map="showOnMap" />
            </ol>
            <p v-else class="rd-atlas-empty">Ngày này đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi nhé.</p>
          </section>
        </div>

        <aside v-if="city" ref="aside" class="rd-atlas-map-column" aria-label="Bản đồ hành trình">
          <dialog ref="mapDialog" class="rd-atlas-map-dialog" aria-labelledby="itinerary-map-title" @cancel.prevent="setView('timeline')">
            <div class="rd-atlas-map__mobile-toolbar"><button type="button" class="rd-btn rd-btn--outline" @click="setView('timeline')">← Lịch trình</button><label for="atlas-map-day" class="visually-hidden">Ngày trên bản đồ</label><select id="atlas-map-day" :value="selection.day" @change="chooseDay(Number(($event.target as HTMLSelectElement).value))"><option v-for="day in days" :key="day.day" :value="day.day">Ngày {{ day.day }} · {{ day.stops.length }} điểm</option></select></div>
            <header class="rd-atlas-map__heading"><div><p class="rd-atlas-eyebrow">Cùng một ngày. Cùng một bản đồ.</p><h2 id="itinerary-map-title">Đường ghé ngày {{ selection.day }}</h2></div><span class="rd-atlas-map__compass"><RdCompass /></span></header>
            <p class="rd-atlas-map__explanation">Số trên bản đồ khớp các điểm trong ngày. Chọn ghim để xem điểm dừng tương ứng.</p>
            <div class="rd-atlas-map__frame">
              <component :is="mapComponent" v-if="mapComponent && anyLocations" :city="city" :stops="currentDay.stops" :selected-key="selection.key" :focus-request="focusRequest" @select="selectFromMap" />
              <div v-else-if="mapComponentFailed" class="rd-atlas-map__placeholder" role="status"><p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p><button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button></div>
              <div v-else class="rd-atlas-map__placeholder"><RdCompass /><p>{{ anyLocations ? 'Bản đồ mở khi bạn bắt đầu khám phá.' : 'Chưa có vị trí công khai cho ngày này.' }}</p><button v-if="anyLocations" type="button" class="rd-btn rd-btn--outline" @click="ensureMap">Mở bản đồ hành trình</button></div>
            </div>
            <p v-if="!hasLocations && anyLocations" class="rd-atlas-map__empty" role="status">Chưa có vị trí công khai cho ngày này.</p>
            <RdItineraryStopCarousel v-if="mobileMap" :stops="currentDay.stops" :selected-key="selection.key" :city-slug="citySlug" @select="selectKey" />
            <RdItineraryActionBar v-if="mounted && wide" :stop="focusStop" :mode="barMode" :day="selection.day" :title="itinerary.title" :url="shareUrl" :fixed="false" :ticket="Boolean(ticket)" @show-map="showOnMap()" @ticket="ticketOpen = true" />
            <nav class="rd-atlas-map__attribution" aria-label="Nguồn bản đồ"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink></nav>
          </dialog>
          <noscript>Bật JavaScript để mở bản đồ. Lịch giờ và nút Chỉ đường vẫn dùng được.</noscript>
        </aside>
      </div>
    </div>
    <footer class="rd-atlas-ending"><RdCompass /><div><p class="rd-atlas-eyebrow">Rẽ một chút. Hay cả chuyến đi.</p><h2>Hành trình còn những ngã rẽ.</h2><p>Ghé bản đồ để khám phá thêm những nơi hợp gu.</p></div><NuxtLink class="rd-btn rd-btn--primary" :to="`/${citySlug}/ban-do`">Khám phá bản đồ <span aria-hidden="true">↗</span></NuxtLink></footer>
    <RdTicketPreview v-if="ticket" v-model:open="ticketOpen" :url="ticket.url" :file-name="ticket.fileName" :title="itinerary.title" :share-url="shareUrl" />
    <RdItineraryActionBar v-if="mounted && !wide && !mobileMap" :stop="focusStop" :mode="barMode" :day="selection.day" :title="itinerary.title" :url="shareUrl" fixed :ticket="Boolean(ticket)" @show-map="showOnMap()" @ticket="ticketOpen = true" />
  </article>
</template>

<style src="../../../assets/journey-atlas.css"></style>
