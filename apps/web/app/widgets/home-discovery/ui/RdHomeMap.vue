<script setup lang="ts">
import { CATEGORY_LABEL, PlaceListResponse, type CityPublic, type PlaceCard } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, type Component } from 'vue';
import { fetchPlacePage } from '~/entities/place/api/places';
import { useApiBase } from '~/shared/api/client';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';

const props = defineProps<{ citySlug: string; city: CityPublic | null; places: PlaceCard[]; failed: boolean }>();
const apiBase = useApiBase();
const locatedPlaces = ref<PlaceCard[]>([]);
const mapComponent = shallowRef<Component | null>(null);
const pending = ref(false);
const previewFailed = ref(false);
const componentFailed = ref(false);
const loaded = ref(false);
const mapReady = ref(false);
const mapFailed = ref(false);
const selectedSlug = ref<string | null>(null);
const selected = computed(() => locatedPlaces.value.find(place => place.slug === selectedSlug.value));
const loadButton = ref<HTMLButtonElement>();
const listElement = ref<HTMLElement>();
const emptyElement = ref<HTMLElement>();
let controller: AbortController | undefined;
let version = 0;

async function loadPreview(): Promise<void> {
  if (!props.city || pending.value) return;
  controller?.abort(); controller = new AbortController();
  const current = ++version;
  pending.value = true; previewFailed.value = false; componentFailed.value = false;
  let importingComponent = false;
  try {
    const page = PlaceListResponse.parse(await fetchPlacePage(apiBase, props.citySlug, { bbox: props.city.mapBounds.join(','), limit: 4 }, controller.signal));
    const places = page.items.filter(place => Boolean(place.location)).slice(0, 4);
    // Load the same client map used by the full discovery route, only on explicit intent.
    importingComponent = places.length > 0;
    const module = places.length ? await import('~/features/place-map/ui/RdPlaceMap.client.vue') : null;
    importingComponent = false;
    if (current !== version) return;
    const moveFocus = document.activeElement === loadButton.value;
    locatedPlaces.value = places; selectedSlug.value = places[0]?.slug ?? null;
    mapComponent.value = module?.default ?? null; loaded.value = true;
    await nextTick();
    if (moveFocus) (listElement.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? emptyElement.value)?.focus();
  } catch {
    if (current === version) { previewFailed.value = true; componentFailed.value = importingComponent; }
  } finally {
    if (current === version) pending.value = false;
  }
}
function retry(): void {
  if (componentFailed.value) window.location.reload();
  else void loadPreview();
}
onBeforeUnmount(() => { version++; controller?.abort(); });
</script>

<template>
  <section id="ban-do" class="rd-home-section rd-map-scene" data-rd-route-scene aria-labelledby="map-preview-title">
    <RdChapterLabel number="05" label="Đặt những nơi hay lên bản đồ" />
    <div class="rd-home-heading"><h2 id="map-preview-title">Mở bản đồ.<br><em>Tìm một nơi hay.</em></h2><p>Nhìn từng điểm ghé trong cùng một vùng.<br>Chọn một nơi, rồi xem đường đi tiếp.</p></div>
    <div class="rd-home-map">
      <div ref="listElement" class="rd-home-map__list">
        <span class="rd-home-kicker">{{ loaded ? 'NHỮNG ĐIỂM ĐANG CÓ TRÊN BẢN ĐỒ' : 'MỘT VÀI ĐIỂM ĐỂ BẮT ĐẦU' }}</span>
        <ol v-if="locatedPlaces.length">
          <li v-for="(place, index) in locatedPlaces" :key="place.slug" :class="{ 'is-active': selectedSlug === place.slug }">
            <button type="button" :aria-pressed="selectedSlug === place.slug" :aria-label="`Xem vị trí ${place.name}`" @click="selectedSlug = place.slug"><span>{{ index + 1 }}</span><span>{{ place.name }}<small>{{ CATEGORY_LABEL[place.category] }}{{ place.zoneName ? ` / ${place.zoneName}` : '' }}</small></span></button>
            <NuxtLink :to="`/${citySlug}/dia-diem/${place.slug}`" :aria-label="`Xem chi tiết ${place.name}`">↗</NuxtLink>
          </li>
        </ol>
        <ul v-else-if="places.length && !loaded" class="rd-home-map__suggestions"><li v-for="place in places.slice(0, 3)" :key="place.slug"><NuxtLink :to="`/${citySlug}/dia-diem/${place.slug}`">{{ place.name }} <span aria-hidden="true">↗</span></NuxtLink></li></ul>
        <p v-else class="rd-home-map__empty">{{ failed && !loaded ? 'Chưa tải được gợi ý. Thử lại ở đầu trang nhé.' : 'Chưa có địa điểm đủ dữ liệu vị trí để xem trước.' }}</p>
        <p v-if="loaded && locatedPlaces.length" class="rd-home-map__hint">{{ locatedPlaces.length }} điểm xem nhanh. Chọn tên hoặc ghim để xem cùng một địa điểm.</p>
        <NuxtLink class="rd-btn rd-btn--primary" :to="`/${citySlug}/ban-do`">Mở bản đồ khám phá <span aria-hidden="true">↗</span></NuxtLink>
        <NuxtLink class="rd-home-map__rain" :to="`/${citySlug}/ban-do?rainSafe=true`">Ngày mưa? Tìm nơi có mái che ↗</NuxtLink>
      </div>
      <div class="rd-home-map__preview" role="group" aria-label="Bản đồ khám phá" :aria-busy="pending || Boolean(mapComponent && !mapReady && !mapFailed)">
        <ClientOnly><component :is="mapComponent" v-if="mapComponent && city" :city="city" :places="locatedPlaces" :selected-slug="selectedSlug" :insets="{ top: 12, bottom: 48 }" @select="selectedSlug = $event" @ready="mapReady = true; mapFailed = false" @error="mapFailed = true" /></ClientOnly>
        <div v-if="!loaded" class="rd-home-map__load">
          <RdCompass /><p class="rd-home-map__invitation">Một điểm trên bản đồ.<br>Một nơi để lên đường.</p>
          <button ref="loadButton" class="rd-btn rd-btn--primary" type="button" :aria-disabled="pending || !city" @click="retry">{{ pending ? 'Đang mở những nơi hay…' : componentFailed ? 'Tải lại trang' : previewFailed ? 'Thử mở lại bản đồ' : 'Xem trước vị trí' }}</button>
          <p v-if="previewFailed" class="rd-home-map__feedback" role="alert">Chưa mở được bản đồ. Thử lại hoặc dùng liên kết bản đồ khám phá nhé.</p>
        </div>
        <p v-if="loaded && !locatedPlaces.length" ref="emptyElement" class="rd-home-map__empty-status" tabindex="-1">Chưa có vị trí để hiển thị.</p>
        <Transition name="rd-map-selection" mode="out-in"><p v-if="selected" :key="selected.slug" class="rd-home-map__selected" aria-live="polite" aria-atomic="true">⌖ {{ selected.name }}</p></Transition>
        <p v-if="mapComponent" class="rd-home-map__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a></p>
        <span v-else class="rd-home-map__caption">Vị trí từ dữ liệu địa điểm · Mở bản đồ khi bạn muốn khám phá</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rd-home-map { display: grid; border: 1px solid var(--line); border-radius: var(--radius-postcard); background: var(--paper-raised); box-shadow: var(--shadow-postcard); }
.rd-home-map__list { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
.rd-home-map ol, .rd-home-map__suggestions { list-style: none; padding: 0; margin: 0; }
.rd-home-map li { display: flex; align-items: center; border-bottom: 1px solid var(--line); }
.rd-home-map li.is-active { background: var(--paper); border-left: 2px solid var(--route-rust); }
.rd-home-map li button { display: flex; flex: 1; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-2); min-height: var(--tap-min); text-align: left; font: 600 13px/1.6 var(--font-body); color: var(--ink); border: 0; background: transparent; cursor: pointer; min-width: 0; overflow-wrap: anywhere; }
.rd-home-map li button > span:first-child { display: grid; place-items: center; width: 28px; height: 28px; flex-shrink: 0; border: 1px solid var(--line); border-radius: var(--radius-pill); font: 12px var(--font-coordinate); }
.rd-home-map li small { display: block; font-size: 11px; font-weight: 400; color: var(--ink-soft); }
.rd-home-map li a { display: grid; place-items: center; min-width: var(--tap-min); min-height: var(--tap-min); text-decoration: none; font-size: 20px; }
.rd-home-map__empty { font-size: 14px; line-height: 1.8; color: var(--ink-soft); }
.rd-home-map__hint { font-size: 11px; line-height: 1.8; color: var(--ink-soft); margin: 0; }
.rd-home-map__suggestions li a { display: flex; justify-content: space-between; flex: 1; font-size: 13px; font-weight: 600; line-height: 1.7; padding: var(--space-3) var(--space-2); gap: var(--space-3); overflow-wrap: anywhere; }
.rd-home-map__list > .rd-btn { margin-top: auto; border-radius: var(--radius-postcard); font-size: 12px; }
.rd-home-map__rain { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 11px; text-underline-offset: 5px; }
.rd-home-map__preview { position: relative; min-width: 0; height: 440px; background-color: var(--mist); background-image: var(--cartographic-grid); background-size: 32px 32px; }
.rd-home-map__load { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-6) var(--space-5) var(--space-16); text-align: center; }
.rd-home-map__load :deep(.rd-compass) { width: 80px; height: 80px; color: var(--route-rust); }
.rd-home-map__invitation { font: 700 23px/1.4 var(--font-display); margin: var(--space-4) 0 var(--space-5); }
.rd-home-map__load .rd-btn { font-size: 12px; border-radius: var(--radius-postcard); }
.rd-home-map__load button[aria-disabled='true'] { cursor: wait;   background-color: var(--disabled-surface); color: var(--disabled-foreground); border-color: var(--disabled-border); opacity: 1;}
.rd-home-map__feedback { background: var(--paper-raised); padding: var(--space-2); margin: var(--space-3) 0 0; font-size: 11px; line-height: 1.6; }
.rd-home-map__selected { position: absolute; left: var(--space-3); bottom: var(--space-12); max-width: 75%; margin: 0; padding: var(--space-3); background: var(--paper-raised); border-left: 2px solid var(--route-rust); font-size: 12px; font-weight: 600; pointer-events: none; overflow-wrap: anywhere; }
.rd-home-map__empty-status { padding: var(--space-6); }
.rd-home-map__caption, .rd-home-map__attribution { position: absolute; bottom: var(--space-2); left: var(--space-3); right: var(--space-3); margin: 0; font-size: 10px; line-height: 1.6; }
.rd-home-map__attribution { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); background: var(--paper-raised); padding-inline: var(--space-2); }
.rd-home-map__attribution a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-map-selection-enter-active, .rd-map-selection-leave-active { transition: opacity var(--dur-standard), transform var(--dur-standard); }
.rd-map-selection-enter-from, .rd-map-selection-leave-to { opacity: 0; transform: translateX(-6px); }
@media (min-width: 768px) { .rd-home-map { grid-template-columns: 0.8fr 1.2fr; } .rd-home-map__list { padding: var(--space-8); } .rd-home-map__preview { height: 500px; } }
</style>
