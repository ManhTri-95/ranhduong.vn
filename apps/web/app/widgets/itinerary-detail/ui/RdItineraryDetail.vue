<script setup lang="ts">
import { CATEGORY_LABEL, itineraryMeta, TRANSPORT_LABEL, type CityPublic, type ItineraryStopPlace, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { computed, nextTick, ref, shallowRef, type Component, type ShallowRef } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import RdItineraryShare from '~/features/itinerary-share/ui/RdItineraryShare.vue';

const props = defineProps<{ itinerary: ItineraryTemplateDetail; city: CityPublic | null; citySlug: string; shareUrl: string }>();
const mapComponent: ShallowRef<Component | null> = shallowRef(null);
const mapComponentFailed = ref(false);
const selectedDay = ref(1);
const selectedKey = ref<string | null>(null);
const mapOpen = ref(false);
const currentDay = computed(() => props.itinerary.days.find((day) => day.day === selectedDay.value) ?? props.itinerary.days[0]!);
const meta = computed(() => itineraryMeta({ days: props.itinerary.days.length, transport: props.itinerary.transport, pace: props.itinerary.pace }));
const categories = (place: ItineraryStopPlace) => [place.category, ...place.alsoCategories].map((category) => CATEGORY_LABEL[category]).join(', ');
const direction = (stop: ItineraryTemplateDetail['days'][number]['stops'][number]) => stop.place ? directionHref({ ...stop.place, status: 'active' }) : undefined;
function chooseDay(day: number): void { selectedDay.value = day; selectedKey.value = null; }
async function openMap(): Promise<void> {
  mapOpen.value = true;
  if (mapComponent.value) return;
  mapComponentFailed.value = false;
  try { mapComponent.value = (await import('~/features/itinerary-map/ui/RdItineraryMap.client.vue')).default; }
  catch { mapComponentFailed.value = true; }
}
async function showOnMap(day: number, key: string): Promise<void> {
  selectedDay.value = day; selectedKey.value = key;
  void openMap();
  await nextTick();
  const heading = document.getElementById('itinerary-map-title');
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function reloadMap(): void { window.location.reload(); }
async function selectStop(key: string): Promise<void> {
  selectedKey.value = key;
  await nextTick();
  const heading = document.getElementById(`stop-${key}`);
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
</script>

<template>
  <article class="rd-itinerary-detail">
    <header class="rd-itinerary-detail__intro">
      <p class="rd-itinerary-detail__eyebrow">Đi theo lịch có sẵn</p>
      <h1 class="page-title">{{ itinerary.title }}</h1>
      <p class="rd-itinerary-detail__meta">{{ meta }}</p>
      <div v-if="itinerary.season || itinerary.style" class="rd-itinerary-detail__chips">
        <span v-if="itinerary.season" class="rd-chip rd-chip--accent">{{ itinerary.season }}</span>
        <span v-if="itinerary.style" class="rd-chip">{{ itinerary.style }}</span>
      </div>
      <p v-if="itinerary.description" class="rd-itinerary-detail__description">{{ itinerary.description }}</p>
      <p class="rd-itinerary-detail__hint">Giờ ghé và thời gian di chuyển là dự kiến. Xem lại giờ mở cửa ở trang địa điểm trước khi đi nhé.</p>
    </header>

    <nav class="rd-itinerary-detail__days" aria-label="Chọn ngày trong lịch trình">
      <a v-for="day in itinerary.days" :key="day.day" :href="`#day-${day.day}`" class="rd-chip rd-chip--filter" :aria-current="day.day === selectedDay ? 'true' : undefined" @click="chooseDay(day.day)">Ngày {{ day.day }}</a>
    </nav>

    <div class="rd-itinerary-detail__columns">
      <div class="rd-itinerary-detail__timeline">
        <section v-for="day in itinerary.days" :key="day.day" :aria-labelledby="`day-${day.day}`" class="rd-itinerary-day">
          <h2 :id="`day-${day.day}`" class="section-title">Ngày {{ day.day }} <span>{{ day.stops.length }} điểm ghé</span></h2>
          <ol v-if="day.stops.length" class="rd-itinerary-day__stops">
            <li v-for="(stop, index) in day.stops" :key="stop.key" class="rd-itinerary-stop" :class="{ 'rd-itinerary-stop--selected': selectedKey === stop.key, 'rd-itinerary-stop--last': index === day.stops.length - 1 }">
              <p v-if="index > 0 && stop.travelMinFromPrev > 0" class="rd-itinerary-stop__travel">{{ TRANSPORT_LABEL[itinerary.transport] }} · khoảng {{ stop.travelMinFromPrev }} phút</p>
              <div class="rd-itinerary-stop__row">
                <button v-if="stop.place?.location && city" type="button" class="rd-itinerary-stop__number" :aria-label="`Xem điểm ${stop.number} ngày ${day.day} trên bản đồ`" :aria-pressed="selectedKey === stop.key" @click="showOnMap(day.day, stop.key)">{{ stop.number }}</button>
                <span v-else class="rd-itinerary-stop__number" aria-hidden="true">{{ stop.number }}</span>
                <div class="rd-itinerary-stop__body">
                  <p class="rd-itinerary-stop__time"><time>{{ stop.start }}</time>–<time>{{ stop.end }}</time><span v-if="stop.kind === 'meal'"> · Bữa ăn</span></p>
                  <h3 :id="`stop-${stop.key}`" tabindex="-1"><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
                  <template v-if="stop.place">
                    <p class="rd-itinerary-stop__meta">{{ categories(stop.place) }}<template v-if="stop.place.zoneName"> · {{ stop.place.zoneName }}</template></p>
                    <p v-if="stop.place.address" class="rd-itinerary-stop__address">{{ stop.place.address }}</p>
                    <p v-if="stop.place.unconfirmed" class="rd-itinerary-stop__hint">Thông tin chưa được quán xác nhận</p>
                  </template>
                  <p v-else class="rd-itinerary-stop__hint">Chỗ này hiện chưa có thông tin công khai. Bạn chọn điểm khác trên bản đồ nhé.</p>
                  <p v-if="stop.note" class="rd-itinerary-stop__note">{{ stop.note }}</p>
                  <a v-if="direction(stop)" :href="direction(stop)" class="rd-btn rd-btn--accent" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">Chỉ đường</a>
                  <p v-else-if="stop.place" class="rd-itinerary-stop__hint">Vị trí đang cập nhật</p>
                </div>
              </div>
            </li>
          </ol>
          <p v-else class="empty-note">Ngày này đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi nhé.</p>
        </section>
      </div>

      <aside v-if="city" class="rd-itinerary-detail__map" aria-labelledby="itinerary-map-title">
        <h2 id="itinerary-map-title" class="section-title" tabindex="-1">Đường ghé ngày {{ currentDay.day }}</h2>
        <p>Số trên bản đồ khớp các điểm trong ngày. Nét đứt nối thứ tự ghé, đường đi thực tế xem ở nút Chỉ đường.</p>
        <button v-if="!mapOpen" type="button" class="rd-btn" @click="openMap">Xem bản đồ lịch trình</button>
        <div v-else-if="mapComponentFailed" role="status">
          <p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p>
          <button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button>
        </div>
        <ClientOnly v-else>
          <component :is="mapComponent" v-if="mapComponent" :city="city" :stops="currentDay.stops" :selected-key="selectedKey" @select="selectStop" />
          <div v-else class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div>
          <template #fallback><div class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div></template>
        </ClientOnly>
        <p v-if="!currentDay.stops.some((stop) => stop.place?.location)" class="empty-note">Chưa có vị trí công khai cho ngày này.</p>
        <nav class="rd-itinerary-detail__attribution" aria-label="Nguồn bản đồ">
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
          <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
        </nav>
        <noscript>Bật JavaScript để mở bản đồ. Lịch giờ và nút Chỉ đường vẫn dùng được.</noscript>
        <NuxtLink class="rd-itinerary-detail__map-link" :to="`/${citySlug}/ban-do`">Chọn thêm chỗ trên bản đồ thành phố →</NuxtLink>
      </aside>
    </div>
    <RdItineraryShare :title="itinerary.title" :url="shareUrl" />
  </article>
</template>

<style scoped>
.rd-itinerary-detail { display: grid; gap: var(--space-6); overflow-wrap: anywhere; }
.rd-itinerary-detail__intro { display: grid; gap: var(--space-3); max-width: 780px; }
.rd-itinerary-detail__intro p { margin: 0; }
.rd-itinerary-detail__eyebrow, .rd-itinerary-detail__meta { color: var(--ink-soft); font-weight: 600; }
.rd-itinerary-detail__description { white-space: pre-line; line-height: 1.8; }
.rd-itinerary-detail__hint { font-size: 13px; color: var(--ink-soft); line-height: 1.7; }
.rd-itinerary-detail__chips, .rd-itinerary-detail__days { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-itinerary-detail__days a { text-decoration: none; min-height: var(--tap-min); }
.rd-itinerary-detail__days a[aria-current='true'] { background: var(--ink); color: var(--paper-raised); }
.rd-itinerary-detail__columns, .rd-itinerary-detail__timeline { display: grid; gap: var(--space-7); min-width: 0; }
.rd-itinerary-day { min-width: 0; }
.rd-itinerary-day h2 { scroll-margin-top: var(--space-5); margin-bottom: var(--space-5); }
.rd-itinerary-day h2 span { color: var(--ink-soft); font: 400 13px var(--font-body); margin-left: var(--space-2); }
.rd-itinerary-day__stops { list-style: none; padding: 0; margin: 0; }
.rd-itinerary-stop { position: relative; padding-bottom: var(--space-6); }
.rd-itinerary-stop::before { content: ''; position: absolute; top: var(--stop-dot); bottom: 0; left: 21px; border-left: 2px dashed var(--line); }
.rd-itinerary-stop--last::before { display: none; }
.rd-itinerary-stop__row { display: flex; align-items: flex-start; gap: var(--space-3); }
.rd-itinerary-stop__number { position: relative; flex: 0 0 var(--tap-min); width: var(--tap-min); min-height: var(--tap-min); display: grid; place-items: center; border: var(--border-ink); border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); font: 700 18px var(--font-body); }
button.rd-itinerary-stop__number { cursor: pointer; }
.rd-itinerary-stop--last .rd-itinerary-stop__number, .rd-itinerary-stop--selected .rd-itinerary-stop__number { background: var(--accent); color: var(--ink); }
.rd-itinerary-stop__body { flex: 1; min-width: 0; display: grid; gap: var(--space-2); }
.rd-itinerary-stop__body h3 { margin: 0; font: 700 19px/1.5 var(--font-display); scroll-margin-top: var(--space-5); }
.rd-itinerary-stop__body h3 a { display: inline-flex; min-height: var(--tap-min); align-items: center; text-decoration: none; }
.rd-itinerary-stop__body p { margin: 0; }
.rd-itinerary-stop__time { font-size: 14px; font-weight: 600; }
.rd-itinerary-stop__meta, .rd-itinerary-stop__address, .rd-itinerary-stop__hint { font-size: 13px; color: var(--ink-soft); line-height: 1.7; }
.rd-itinerary-stop__note { white-space: pre-line; font: 20px/1.6 var(--font-hand); }
.rd-itinerary-stop__body > a { justify-self: start; margin-top: var(--space-1); }
.rd-itinerary-stop__travel { margin: 0 0 var(--space-3) calc(var(--tap-min) + var(--space-3)); color: var(--ink-soft); font-size: 13px; font-style: italic; }
.rd-itinerary-detail__map { display: grid; gap: var(--space-3); align-content: start; min-width: 0; padding: var(--space-4); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.rd-itinerary-detail__map > p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--ink-soft); }
.rd-itinerary-detail__map-loading { height: 360px; background: var(--map-land); padding: var(--space-4); }
.rd-itinerary-detail__attribution { font-size: 10px; line-height: 1.7; }
.rd-itinerary-detail__map-link { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 13px; }
@media (min-width: 1024px) {
  .rd-itinerary-detail__columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: calc(var(--space-7) * 2); }
  .rd-itinerary-detail__map { position: sticky; top: var(--space-5); }
}
</style>
