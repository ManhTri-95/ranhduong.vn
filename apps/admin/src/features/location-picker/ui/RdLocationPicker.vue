<script setup lang="ts">
import { parseLatLng, type BBox, type LngLat } from '@ranhduong/contracts';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre tự tìm worker cạnh file của nó (import.meta.url); Vite gộp file đó lại nên phải chỉ đường dẫn worker do Vite xuất ra.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { MAP_STYLE_URL } from '@/shared/config';
import { bboxContains, canPinHere, expandBBox, formatLatLng, locationAfterMove, MIN_PIN_ZOOM, roundLngLat, type MoveGesture } from '../lib/geo-view';

const props = defineProps<{ modelValue: LngLat | null; cityCenter: LngLat; cityBounds: BBox }>();
const emit = defineEmits<{ 'update:modelValue': [value: LngLat | null] }>();

/** Cho kéo ra ngoài khung các cụm khoảng 20 km để ghim được điểm ngoại ô (Langbiang, Cầu Đất, Tuyền Lâm). */
const PAN_MARGIN_DEG = 0.2;
/** Chữ của MapLibre bằng tiếng Việt (khoá theo defaultLocale của maplibre-gl). */
const LOCALE = {
  'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl và cuộn để phóng to, thu nhỏ bản đồ',
  'CooperativeGesturesHandler.MacHelpText': 'Giữ ⌘ và cuộn để phóng to, thu nhỏ bản đồ',
  'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để kéo bản đồ',
  'NavigationControl.ZoomIn': 'Phóng to',
  'NavigationControl.ZoomOut': 'Thu nhỏ',
};

const container = ref<HTMLDivElement | null>(null);
const map = shallowRef<MapLibreMap | null>(null);
const mapLoaded = ref(false);
const mapFailed = ref(false);
const zoom = ref(props.modelValue ? 17 : 12);
const pinAllowed = computed(() => canPinHere({ loaded: mapLoaded.value, failed: mapFailed.value, zoom: zoom.value }));
const coordText = ref('');
const coordError = ref<string | null>(null);
const outside = computed(() => props.modelValue !== null && !bboxContains(props.cityBounds, props.modelValue));

onMounted(async () => {
  try {
    // Tải MapLibre khi form mở (ADR 0008), không nằm trong bundle chính của admin.
    const maplibre = await import('maplibre-gl');
    if (!container.value) return;
    maplibre.setWorkerUrl(mapWorkerUrl);
    const instance = new maplibre.Map({
      container: container.value,
      style: MAP_STYLE_URL,
      center: props.modelValue ?? props.cityCenter,
      zoom: zoom.value,
      // ui-spec mục 6: minZoom khoảng 11; ở mức này khung nhìn còn nằm gọn trong maxBounds nên thu nhỏ không đẩy tâm.
      minZoom: 11,
      maxBounds: expandBBox(props.cityBounds, PAN_MARGIN_DEG),
      // Form dài: một ngón tay vẫn cuộn trang, hai ngón mới kéo bản đồ.
      cooperativeGestures: true,
      doubleClickZoom: false,
      boxZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      // Ghi nguồn OpenStreetMap luôn hiện (ADR 0008), không thu vào nút (i) khi màn hẹp.
      attributionControl: { compact: false },
      locale: LOCALE,
    });
    // Phóng to, thu nhỏ quanh tâm: ghim (ở tâm) không bị dời khi chỉ muốn nhìn gần hơn.
    instance.scrollZoom.enable({ around: 'center' });
    instance.touchZoomRotate.enable({ around: 'center' });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
    // Chỉ kéo bản đồ mới dời ghim; phóng to, thu nhỏ không dời (khung maxBounds có thể đẩy tâm đi khi thu nhỏ).
    let dragging = false;
    instance.on('dragstart', () => {
      dragging = true;
    });
    instance.on('moveend', (event) => {
      const gesture: MoveGesture = dragging ? 'drag' : event.originalEvent ? 'zoom' : 'program';
      dragging = false;
      zoom.value = instance.getZoom();
      const next = locationAfterMove(props.modelValue, instance.getCenter().toArray(), gesture);
      if (next !== props.modelValue) emit('update:modelValue', next);
    });
    instance.on('load', () => {
      mapLoaded.value = true;
    });
    instance.on('error', () => {
      if (!instance.isStyleLoaded()) mapFailed.value = true;
    });
    map.value = instance;
  } catch {
    mapFailed.value = true;
  }
});
onBeforeUnmount(() => map.value?.remove());

// Toạ độ đổi từ ngoài (dán toạ độ, khôi phục bản trên máy): đưa bản đồ tới đó.
watch(
  () => props.modelValue,
  (value) => {
    const instance = map.value;
    if (!instance || !value) return;
    const [lng, lat] = roundLngLat(instance.getCenter().toArray());
    if (lng !== value[0] || lat !== value[1]) instance.jumpTo({ center: value, zoom: Math.max(instance.getZoom(), 16) });
  },
);

function pinHere(): void {
  if (map.value && pinAllowed.value) emit('update:modelValue', roundLngLat(map.value.getCenter().toArray()));
}

const hint = computed(() => {
  if (props.modelValue) return 'Kéo bản đồ (hai ngón trên điện thoại) cho ghim nằm đúng cửa quán.';
  if (mapLoaded.value && zoom.value < MIN_PIN_ZOOM) return 'Phóng to tới khi thấy rõ đường, nhà, kéo bản đồ cho ghim nằm đúng chỗ rồi bấm "Ghim ở đây".';
  return 'Kéo bản đồ cho ghim nằm đúng chỗ rồi bấm "Ghim ở đây".';
});

function applyCoords(): void {
  const point = parseLatLng(coordText.value);
  if (!point) {
    coordError.value = 'Toạ độ dạng "lat,lng", hai số cách nhau dấu phẩy.';
    return;
  }
  coordError.value = null;
  coordText.value = '';
  emit('update:modelValue', point);
}
</script>

<template>
  <div class="picker">
    <div class="frame">
      <div ref="container" class="map" role="region" aria-label="Bản đồ chọn vị trí"></div>
      <svg class="rd-pin center-pin" :class="{ 'center-pin--unset': !modelValue }" viewBox="0 0 32 40" aria-hidden="true">
        <path class="drop" d="M16 38C16 38 3 23.5 3 14a13 13 0 0 1 26 0c0 9.5-13 24-13 24Z" />
        <circle class="glyph" cx="16" cy="14" r="4" />
      </svg>
      <p v-if="mapFailed" class="rd-callout rd-callout--warn map-failed">Chưa tải được bản đồ. Vẫn dán toạ độ bên dưới được.</p>
    </div>
    <p class="rd-field__hint">{{ hint }}</p>
    <div class="actions">
      <button v-if="!modelValue" type="button" class="rd-btn rd-btn--primary" :disabled="!pinAllowed" @click="pinHere">Ghim ở đây</button>
      <template v-else>
        <span class="coords">{{ formatLatLng(modelValue) }}</span>
        <button type="button" class="rd-btn rd-btn--outline" @click="emit('update:modelValue', null)">Bỏ ghim</button>
      </template>
    </div>
    <p v-if="outside" class="rd-callout rd-callout--warn">
      Ghim nằm ngoài khung các cụm của thành phố. Kiểm tra lại, nhất là thứ tự lat,lng khi dán.
    </p>
    <div class="rd-field">
      <label class="rd-field__label" for="coord-paste">Hoặc dán toạ độ (lat,lng)</label>
      <div class="paste">
        <input id="coord-paste" v-model="coordText" class="rd-input" type="text" inputmode="decimal" autocomplete="off" @keydown.enter.prevent="applyCoords" />
        <button type="button" class="rd-btn rd-btn--outline" @click="applyCoords">Đặt ghim</button>
      </div>
      <p v-if="coordError" class="rd-field__error" role="alert">{{ coordError }}</p>
    </div>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: var(--space-3); }
.frame { position: relative; height: 280px; border: var(--border); border-radius: var(--radius-card); overflow: hidden; background: var(--map-land); }
.map { position: absolute; inset: 0; }
/* Nút phóng to, thu nhỏ của MapLibre mặc định 29px; vùng bấm tối thiểu 44px. */
.frame :deep(.maplibregl-ctrl-group button) { width: var(--tap-min); height: var(--tap-min); }
.center-pin { position: absolute; left: 50%; top: 50%; width: 32px; height: 40px; transform: translate(-50%, -100%); pointer-events: none; z-index: 1; }
.center-pin--unset path.drop { fill: var(--mist); stroke-dasharray: 4 3; }
.map-failed { position: absolute; left: var(--space-3); right: var(--space-3); bottom: var(--space-3); z-index: 2; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.coords { font: 600 15px/20px var(--font-body); font-variant-numeric: tabular-nums; }
.paste { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.paste .rd-input { flex: 1 1 180px; }
@media (min-width: 768px) { .frame { height: 360px; } }
</style>
