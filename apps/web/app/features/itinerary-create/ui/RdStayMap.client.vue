<script setup lang="ts">
import type { CityPublic, GeoPoint } from '@ranhduong/contracts';
import type { Map as LibreMap, Marker } from 'maplibre-gl';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { resolveMapStyleSprites } from '~/shared/lib/map-style';

const props = defineProps<{ city: CityPublic; location?: GeoPoint }>();
const emit = defineEmits<{ select: [location: GeoPoint] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const surface = ref<HTMLDivElement>();
const loading = ref(true);
const failed = ref(false);
const outside = ref(false);
let map: LibreMap | undefined;
let marker: Marker | undefined;
let library: typeof import('maplibre-gl') | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let observer: ResizeObserver | undefined;
let generation = 0;
let disposed = false;
let assetsFailed = false;

function draw(): void {
  marker?.remove(); marker = undefined;
  if (!props.location || !map || !library) return;
  const pin = document.createElement('span');
  pin.className = 'rd-stay-pin'; pin.textContent = '●'; pin.setAttribute('aria-label', 'Nơi ở đã ghim');
  marker = new library.Marker({ element: pin }).setLngLat(props.location.coordinates).addTo(map);
}
function select(lng: number, lat: number): void {
  if (disposed || loading.value || failed.value) return;
  const [west, south, east, north] = props.city.mapBounds;
  outside.value = lng < west || lng > east || lat < south || lat > north;
  if (!outside.value) emit('select', { type: 'Point', coordinates: [lng, lat] });
}
function pinCenter(): void {
  const center = map?.getCenter();
  if (center) select(center.lng, center.lat);
}
async function start(): Promise<void> {
  const current = ++generation;
  clearTimeout(timer); marker?.remove(); map?.remove(); map = undefined;
  loading.value = true; failed.value = false; assetsFailed = false;
  try {
    const [lib, , worker] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')]);
    if (disposed || current !== generation || !surface.value) return;
    library = lib; lib.setWorkerUrl(worker.default);
    const instance = new lib.Map({
      container: surface.value, center: props.location?.coordinates ?? props.city.center.coordinates,
      zoom: 12, maxBounds: props.city.mapBounds, dragRotate: false, pitchWithRotate: false,
      attributionControl: false, cooperativeGestures: true,
      locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ', 'CooperativeGesturesHandler.TouchPanBlocker': 'Dùng hai ngón tay để kéo bản đồ', 'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl khi cuộn để thu phóng' },
    });
    map = instance; instance.touchZoomRotate.disableRotation(); instance.keyboard.disableRotation();
    instance.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');
    const reportError = () => { if (!disposed && map === instance) { failed.value = true; loading.value = false; } };
    timer = setTimeout(reportError, 15_000); instance.on('error', reportError);
    instance.on('load', () => { if (disposed || map !== instance) return; clearTimeout(timer); loading.value = false; draw(); });
    instance.on('click', event => { if (map === instance) select(event.lngLat.lng, event.lngLat.lat); });
    instance.setStyle(styleUrl, { transformStyle: (_previous, next) => resolveMapStyleSprites(next, styleUrl, window.location.href) });
  } catch { if (!disposed && current === generation) { assetsFailed = !library; failed.value = true; loading.value = false; } }
}
function retry(): void {
  // A rejected dynamic import stays rejected until reload. Close/reopen or select a cluster to keep the form.
  if (assetsFailed) { failed.value = true; return; }
  void start();
}
watch(() => props.location, draw, { deep: true });
onMounted(() => {
  void start();
  if (surface.value) { observer = new ResizeObserver(() => map?.resize()); observer.observe(surface.value); }
});
onBeforeUnmount(() => { disposed = true; generation++; clearTimeout(timer); observer?.disconnect(); marker?.remove(); map?.remove(); });
</script>

<template>
  <div class="rd-stay-map">
    <p id="stay-map-help">Chạm vào bản đồ để ghim. Bạn cũng có thể dùng phím mũi tên để dịch bản đồ rồi bấm “Ghim tại giữa bản đồ”. Dùng hai ngón tay để kéo trên điện thoại.</p>
    <div class="rd-stay-map__frame">
      <div ref="surface" class="rd-stay-map__surface" role="region" aria-label="Bản đồ chọn nơi ở" aria-describedby="stay-map-help" />
      <span v-if="!loading && !failed" class="rd-stay-map__cross" aria-hidden="true">＋</span>
      <p v-if="loading" class="rd-stay-map__notice" role="status">Đang mở bản đồ…</p>
      <div v-if="failed" class="rd-stay-map__notice" role="status">
        <p>Chưa mở được bản đồ. Bạn chọn cụm hoặc bỏ qua nơi ở cũng được.</p>
        <button v-if="!assetsFailed" type="button" class="rd-btn rd-btn--outline" @click="retry">Thử lại bản đồ</button>
      </div>
    </div>
    <button type="button" class="rd-btn rd-btn--outline" :disabled="loading || failed" @click="pinCenter">Ghim tại giữa bản đồ</button>
    <p v-if="outside" role="status">Ghim này ở ngoài khu vực thành phố. Dịch bản đồ vào trong khung nhé.</p>
    <p class="rd-stay-map__credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a></p>
  </div>
</template>

<style scoped>
.rd-stay-map { display: grid; gap: var(--space-3); }
.rd-stay-map > p { margin: 0; font-size: var(--text-utility); line-height: 1.8; color: var(--ink-soft); }
.rd-stay-map__frame { position: relative; overflow: hidden; border: var(--border); border-radius: var(--radius-card); }
.rd-stay-map__surface { height: 320px; background: var(--map-land); }
.rd-stay-map__cross { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); pointer-events: none; font-size: 32px; color: var(--ink); }
.rd-stay-map__notice { position: absolute; inset: var(--space-3); padding: var(--space-4); background: var(--paper-raised); color: var(--ink); align-content: center; text-align: center; }
.rd-stay-map :deep(.rd-stay-pin) { width: var(--tap-min); height: var(--tap-min); display: grid; place-items: center; font-size: 28px; background: var(--paper-raised); color: var(--brand-primary); border: var(--border-ink); border-radius: var(--radius-pill); }
.rd-stay-map :deep(.maplibregl-ctrl-group button) { width: var(--tap-min); height: var(--tap-min); }
.rd-stay-map__credit a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
</style>
