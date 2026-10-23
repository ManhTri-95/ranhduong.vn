<script setup lang="ts">
import type { CityPublic, PlaceDetail } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, type Component } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import { coordinateLabel, placeMapCard } from '~/entities/place/lib/place-story';
import { placeMapHref } from '~/entities/place/lib/map-focus';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';

const props = withDefaults(defineProps<{ place: PlaceDetail; city?: CityPublic | null; citySlug: string; chapter?: string }>(), { chapter: '06' });
const point = computed(() => placeMapCard(props.place));
const directions = computed(() => directionHref(props.place));
const coordinates = computed(() => coordinateLabel(props.place.location));
const mapComponent = shallowRef<Component>();
const pending = ref(false);
const importFailed = ref(false);
const ready = ref(false);
const failed = ref(false);
const notice = ref('');
const manualCopy = ref(false);
const copying = ref(false);
const loadButton = ref<HTMLButtonElement>();
const mapElement = ref<HTMLElement>();
let disposed = false;

async function loadMap(): Promise<void> {
  if (pending.value || !point.value || !props.city) return;
  if (importFailed.value) { window.location.reload(); return; }
  pending.value = true;
  try {
    const module = await import('~/features/place-map/ui/RdPlaceMap.client.vue');
    if (disposed) return;
    const moveFocus = document.activeElement === loadButton.value;
    mapComponent.value = module.default;
    await nextTick();
    if (moveFocus) mapElement.value?.focus();
  } catch { if (!disposed) importFailed.value = true; }
  finally { if (!disposed) pending.value = false; }
}
async function copyAddress(): Promise<void> {
  if (!props.place.address || copying.value) return;
  copying.value = true; notice.value = ''; manualCopy.value = false;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(props.place.address);
    if (!disposed) notice.value = 'Đã sao chép địa chỉ.';
  } catch {
    if (!disposed) { manualCopy.value = true; notice.value = 'Chưa sao chép tự động được. Bạn chọn địa chỉ bên dưới để chép nhé.'; }
  } finally { if (!disposed) copying.value = false; }
}
onBeforeUnmount(() => { disposed = true; });
</script>

<template>
  <section id="find-your-way" class="rd-story-section rd-place-directions" data-rd-route-scene aria-labelledby="directions-title">
    <RdChapterLabel :number="chapter" label="Tìm đường đến một câu chuyện" />
    <div class="rd-story-heading"><h2 id="directions-title">Đường <em>đến đây.</em></h2><p>{{ point ? 'Xem vị trí trước khi lên đường.' : 'Vị trí đang được bổ sung.' }}<br>Phần đường còn lại, bạn chọn.</p></div>
    <div class="rd-place-directions__layout">
      <div class="rd-place-directions__info">
        <RdCompass />
        <span class="rd-story-kicker">ĐỊA CHỈ TRONG GHI CHÉP</span>
        <h3>{{ place.name }}</h3><p class="rd-place-directions__address">{{ place.address || 'Địa chỉ đang cập nhật' }}</p>
        <p v-if="coordinates" class="rd-place-directions__coordinates">{{ coordinates }}</p>
        <div class="rd-place-directions__actions">
          <a v-if="directions" class="rd-btn rd-btn--primary" :href="directions" target="_blank" rel="noopener noreferrer" data-rd-event="direction_click" :data-rd-place-id="place.id">Chỉ đường bằng Google Maps ↗</a>
          <button v-if="place.address" type="button" class="rd-btn rd-btn--outline" :aria-disabled="copying" @click="copyAddress">{{ copying ? 'Đang sao chép…' : 'Sao chép địa chỉ' }}</button>
        </div>
        <p class="rd-place-directions__feedback" role="status" aria-live="polite">{{ notice }}</p>
        <label v-if="manualCopy" class="rd-place-directions__manual">Địa chỉ để sao chép<input :value="place.address" readonly @focus="($event.target as HTMLInputElement).select()"></label>
        <NuxtLink class="rd-place-directions__full" :to="placeMapHref(citySlug, place.slug)">Mở bản đồ quanh địa điểm này ↗</NuxtLink>
      </div>
      <div ref="mapElement" class="rd-place-directions__map" role="group" aria-label="Vị trí địa điểm trên bản đồ" tabindex="-1" :aria-busy="pending || Boolean(mapComponent && !ready && !failed)">
        <ClientOnly><component :is="mapComponent" v-if="mapComponent && city && point" :city="city" :places="[point]" :selected-slug="place.slug" :initial-view="{ center: point.location!.coordinates, zoom: 14 }" :insets="{ top: 12, bottom: 56 }" @ready="ready = true; failed = false" @error="failed = true" /></ClientOnly>
        <div v-if="!mapComponent" class="rd-place-directions__invitation">
          <svg viewBox="0 0 260 120" fill="none" aria-hidden="true"><path pathLength="1000" d="M5 100C55 110 30 20 100 35S150 120 190 60 230 20 245 24" /><circle cx="245" cy="24" r="7" /></svg>
          <span class="rd-place-directions__pin" aria-hidden="true">⌖</span>
          <p>{{ point ? 'Từ một dấu chấm, bắt đầu một chuyến đi.' : 'Vị trí đang được bổ sung.' }}</p>
          <button v-if="point && city" ref="loadButton" type="button" class="rd-btn rd-btn--primary" :aria-disabled="pending" @click="loadMap">{{ pending ? 'Đang mở bản đồ…' : importFailed ? 'Tải lại trang để mở bản đồ' : 'Xem vị trí trên bản đồ' }}</button>
          <p v-else class="rd-place-directions__unavailable">{{ !point ? 'Mình chưa có đủ tọa độ để đặt ghim chính xác.' : 'Chưa tải được dữ liệu bản đồ thành phố. Bạn vẫn có thể dùng liên kết chỉ đường.' }}</p>
          <p v-if="importFailed" role="alert">Chưa tải được bản đồ. Thử tải lại hoặc dùng Chỉ đường nhé.</p>
          <noscript><p>Bật JavaScript để xem bản đồ tại đây, hoặc mở liên kết chỉ đường.</p></noscript>
        </div>
        <p v-if="mapComponent" class="rd-place-directions__attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a></p>
        <span v-else class="rd-place-directions__caption">SƠ ĐỒ TRANG TRÍ · CHƯA TẢI BẢN ĐỒ</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rd-place-directions__layout { display: grid; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-postcard); box-shadow: var(--shadow-postcard); }
.rd-place-directions__info { display: flex; flex-direction: column; align-items: start; gap: var(--space-4); padding: var(--space-6); min-width: 0; }.rd-place-directions__info > :deep(svg) { width: 54px; height: 54px; color: var(--route-rust); }
.rd-place-directions__info h3 { margin: 0; font: 600 26px/1.3 var(--font-display); overflow-wrap: anywhere; }.rd-place-directions__address { margin: 0; font-size: 14px; line-height: 1.8; }.rd-place-directions__coordinates { margin: 0; font: 11px/1.8 var(--font-coordinate); color: var(--ink-soft); }
.rd-place-directions__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }.rd-place-directions__actions .rd-btn { font-size: 12px; border-radius: var(--radius-postcard); padding-inline: var(--space-3); }
.rd-place-directions__feedback { margin: 0; min-height: 1.8em; font-size: 12px; line-height: 1.8; }.rd-place-directions__manual { width: 100%; font-size: 13px; }.rd-place-directions__manual input { display: block; box-sizing: border-box; width: 100%; min-height: var(--tap-min); border: var(--border-ink); border-radius: var(--radius-postcard); background: var(--paper); padding: var(--space-2); color: var(--ink); font: 16px var(--font-body); margin-top: var(--space-2); }
.rd-place-directions__full { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 12px; text-underline-offset: 5px; }
.rd-place-directions__map { position: relative; height: 420px; background-color: var(--map-land); background-image: var(--cartographic-grid); background-size: 32px 32px; min-width: 0; }
.rd-place-directions__invitation { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: var(--space-6); gap: var(--space-4); }.rd-place-directions__invitation > svg { width: min(70%, 260px); height: 120px; color: var(--route-rust); }.rd-place-directions__invitation path { stroke: currentColor; stroke-width: 2; stroke-dasharray: 1000; stroke-dashoffset: calc(1000 * (1 - var(--rd-route-progress, 1))); }.rd-place-directions__invitation circle { stroke: currentColor; fill: var(--paper-raised); stroke-width: 2; }
.rd-place-directions__pin { display: none; }.rd-place-directions__invitation p { margin: 0; font: 23px/1.4 var(--font-hand); }.rd-place-directions__invitation .rd-btn { font-size: 12px; border-radius: var(--radius-postcard); }.rd-place-directions__invitation .rd-place-directions__unavailable, .rd-place-directions__invitation [role='alert'], .rd-place-directions__invitation noscript p { font: 12px/1.8 var(--font-body); }
.rd-place-directions__caption { position: absolute; bottom: var(--space-4); left: var(--space-4); right: var(--space-4); font: 9px/1.7 var(--font-coordinate); color: var(--ink-soft); text-align: center; }
.rd-place-directions__attribution { position: absolute; bottom: var(--space-2); left: var(--space-2); right: var(--space-2); display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); margin: 0; padding: 0 var(--space-2); background: var(--paper-raised); font-size: 10px; line-height: 1.6; }.rd-place-directions__attribution a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
@media (min-width: 768px) { .rd-place-directions__layout { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); }.rd-place-directions__info { padding: var(--space-8); }.rd-place-directions__map { height: auto; min-height: 500px; } }
</style>
