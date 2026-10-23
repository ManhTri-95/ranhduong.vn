<script setup lang="ts">
import { CATEGORY_LABEL, type CityPublic, type PlaceCard } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, type Component, type ShallowRef } from 'vue';
import { fetchAreaPreview } from '~/entities/place/api/area-preview';
import { areaMapHref, type AreaFilter } from '~/entities/place/lib/area-guide';
import { useApiBase } from '~/shared/api/client';
import RdCompass from '~/shared/ui/RdCompass.vue';
const props = defineProps<{ city: CityPublic | null; citySlug: string; zoneSlug: string; filter: AreaFilter; places: PlaceCard[] }>();
const apiBase = useApiBase();
const points = ref<PlaceCard[]>([]);
const href = computed(() => areaMapHref(props.citySlug, props.zoneSlug, props.filter));
const selectedSlug = ref<string | null>(null);
const mapComponent: ShallowRef<Component | null> = shallowRef(null);
const pending = ref(false);
const failed = ref(false);
const componentFailed = ref(false);
const loaded = ref(false);
const ready = ref(false);
const mapFailed = ref(false);
const loadButton = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);
const emptyMessage = ref<HTMLElement | null>(null);
let disposed = false;
let controller: AbortController | undefined;
let version = 0;
async function openMap(slug?: string): Promise<void> {
  if (slug) selectedSlug.value = slug;
  const city = props.city;
  if (!city || pending.value || mapComponent.value) return;
  if (componentFailed.value) { window.location.reload(); return; }
  controller?.abort(); controller = new AbortController();
  const current = ++version;
  pending.value = true; failed.value = false;
  let importing = false;
  try {
    const found = await fetchAreaPreview(apiBase, props.citySlug, props.zoneSlug, city.mapBounds, props.filter, controller.signal);
    if (disposed || current !== version) return;
    importing = found.length > 0;
    const module = found.length ? await import('~/features/place-map/ui/RdPlaceMap.client.vue') : null;
    importing = false;
    if (disposed || current !== version) return;
    // Keep ownership until immediately before the focused trigger is replaced.
    const moveFocus = document.activeElement === loadButton.value;
    points.value = found;
    selectedSlug.value = found[0]?.slug ?? null;
    mapComponent.value = module?.default ?? null;
    loaded.value = true;
    await nextTick();
    if (moveFocus && !disposed) (list.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? emptyMessage.value)?.focus({ preventScroll: true });
  } catch { if (!disposed && current === version) { failed.value = true; componentFailed.value = importing; } }
  finally { if (!disposed && current === version) pending.value = false; }
}
onBeforeUnmount(() => { disposed = true; version++; controller?.abort(); });
</script>

<template>
  <section class="rd-field-map" data-rd-route-scene aria-labelledby="field-map-title">
    <div class="rd-field-map__copy"><p class="rd-field-kicker">Đặt một nơi lên bản đồ</p><h2 id="field-map-title">Muốn biết những nơi này <em>nằm đâu?</em></h2><p>Mở bản đồ để khám phá các địa điểm trong khu vực và chọn nơi bạn muốn ghé.</p>
      <ol v-if="points.length" ref="list" class="rd-field-map__places"><li v-for="(place, index) in points" :key="place.slug"><button type="button" :aria-pressed="selectedSlug === place.slug" @click="openMap(place.slug)"><span aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ place.name }}<small>{{ CATEGORY_LABEL[place.category] }}</small></span><span aria-hidden="true">↗</span></button></li></ol>
      <ul v-else-if="!loaded && places.length" class="rd-field-map__suggestions"><li v-for="place in places.slice(0, 3)" :key="place.slug"><NuxtLink :to="`/${citySlug}/dia-diem/${place.slug}`">{{ place.name }} <span aria-hidden="true">↗</span></NuxtLink></li></ul>
      <p v-if="points.length" class="rd-field-map__note">{{ points.length }} vị trí xem nhanh, khớp khu vực và bộ lọc. Mở bản đồ khám phá để xem thêm địa điểm trong khu.</p>
      <NuxtLink class="rd-btn rd-btn--primary" :to="href">Khám phá trên bản đồ <span aria-hidden="true">↗</span></NuxtLink>
    </div>
    <div class="rd-field-map__surface" role="group" aria-label="Xem trước bản đồ khu vực" :aria-busy="pending || Boolean(mapComponent && !ready && !mapFailed)">
      <ClientOnly><component :is="mapComponent" v-if="mapComponent && city" :city="city" :places="points" :selected-slug="selectedSlug" fit-initial-places journal :insets="{ top: 12, bottom: 112 }" @select="selectedSlug = $event" @ready="ready = true; mapFailed = false" @error="mapFailed = true" /></ClientOnly>
      <div v-if="!mapComponent" class="rd-field-map__invite"><span class="rd-field-map__compass"><RdCompass /></span><p>Một điểm trên bản đồ.<br>Một lý do để lên đường.</p><p v-if="loaded && !points.length" ref="emptyMessage" tabindex="-1" class="rd-field-map__unavailable" role="status">Chưa có vị trí công khai khớp khu vực và bộ lọc này.</p><button v-if="city" ref="loadButton" type="button" class="rd-btn rd-btn--outline" :aria-disabled="pending" @click="openMap()">{{ pending ? 'Đang mở bản đồ…' : componentFailed ? 'Tải lại để mở bản đồ' : failed || loaded ? 'Thử xem lại vị trí' : 'Xem trước vị trí' }}</button><p v-else class="rd-field-map__unavailable">Chưa tải được thông tin bản đồ thành phố. Thử lại ở đầu trang hoặc mở bản đồ khám phá.</p><p v-if="failed" role="alert" class="rd-field-map__unavailable">Chưa tải được bản đồ. Thử lại hoặc mở liên kết bên cạnh nhé.</p><span class="rd-field-map__caption">HỌA TIẾT TRANG TRÍ · CHƯA TẢI BẢN ĐỒ</span></div>
      <p v-if="mapComponent" class="rd-field-map__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink></p>
    </div>
  </section>
</template>
