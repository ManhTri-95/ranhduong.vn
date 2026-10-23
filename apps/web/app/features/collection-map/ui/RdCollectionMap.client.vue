<script setup lang="ts">
import type { CityPublic, PlaceCard } from '@ranhduong/contracts';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { resolveMapStyleSprites } from '~/shared/lib/map-style';

const props = defineProps<{ city: CityPublic; places: PlaceCard[]; selectedSlug: string | null }>();
const emit = defineEmits<{ select: [slug: string] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const container = ref<HTMLDivElement>();
const loading = ref(true);
const failed = ref(false);
let map: MapLibreMap | undefined;
let library: typeof import('maplibre-gl') | undefined;
let markers: Marker[] = [];
let observer: ResizeObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let disposed = false;
let assetsFailed = false;
const duration = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250;

function fit(): void {
  if (!map || !library) return;
  const bounds = new library.LngLatBounds();
  props.places.forEach(place => { if (place.location) bounds.extend(place.location.coordinates); });
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 62, maxZoom: 14, duration: duration() });
}
function select(): void {
  markers.forEach(marker => {
    const button = marker.getElement();
    button.setAttribute('aria-pressed', String(button.dataset.slug === props.selectedSlug));
  });
  const selected = props.places.find(place => place.slug === props.selectedSlug);
  if (selected?.location) map?.easeTo({ center: selected.location.coordinates, duration: duration() });
}
function draw(): void {
  if (!map || !library || loading.value) return;
  markers.forEach(marker => marker.remove()); markers = [];
  const overlaps = new Map<string, number>();
  props.places.forEach((place, index) => {
    if (!place.location || !library || !map) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'rd-collection-pin'; button.dataset.slug = place.slug;
    button.textContent = String(index + 1).padStart(2, '0');
    button.setAttribute('aria-label', `Điểm ${index + 1}: ${place.name}`);
    button.addEventListener('click', () => emit('select', place.slug));
    const key = place.location.coordinates.join(',');
    const repeat = overlaps.get(key) ?? 0; overlaps.set(key, repeat + 1);
    // Keep coincident pins inside even a narrow mobile canvas; the list remains available for overlaps.
    const offsets: [number, number][] = [[0, 0], [-46, 0], [46, 0], [0, -46], [0, 46], [-46, -46], [46, -46], [-46, 46], [46, 46]];
    markers.push(new library.Marker({ element: button, offset: offsets[repeat % offsets.length] }).setLngLat(place.location.coordinates).addTo(map));
  });
  fit(); select();
}
async function start(): Promise<void> {
  const current = ++generation;
  clearTimeout(timer); markers.forEach(marker => marker.remove()); markers = []; map?.remove(); map = undefined;
  loading.value = true; failed.value = false; assetsFailed = false;
  let imported = false;
  try {
    const [module, , worker] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')]);
    imported = true;
    if (disposed || current !== generation || !container.value) return;
    library = module; module.setWorkerUrl(worker.default);
    const instance = new module.Map({ container: container.value, center: props.city.center.coordinates, zoom: 12, maxBounds: props.city.mapBounds, cooperativeGestures: true, dragRotate: false, pitchWithRotate: false, attributionControl: false, locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ', 'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl và cuộn để phóng to bản đồ', 'CooperativeGesturesHandler.MacHelpText': 'Giữ ⌘ và cuộn để phóng to bản đồ', 'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để di chuyển bản đồ' } });
    map = instance; instance.touchZoomRotate.disableRotation(); instance.keyboard.disableRotation();
    instance.addControl(new module.NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new module.AttributionControl({ compact: false }));
    const reportError = () => { if (!disposed && map === instance) { failed.value = true; loading.value = false; } };
    timer = setTimeout(reportError, 15_000);
    instance.on('error', reportError);
    instance.on('load', () => { if (disposed || map !== instance) return; clearTimeout(timer); loading.value = false; draw(); });
    instance.setStyle(styleUrl, { transformStyle: (_previous, next) => resolveMapStyleSprites(next, styleUrl, window.location.href) });
  } catch { if (!disposed && current === generation) { assetsFailed = !imported; failed.value = true; loading.value = false; } }
}
function retry(): void { if (assetsFailed) window.location.reload(); else void start(); }
watch(() => props.selectedSlug, select);
watch(() => props.places, draw);
onMounted(() => {
  void start();
  observer = new ResizeObserver(() => map?.resize());
  if (container.value) observer.observe(container.value);
});
onBeforeUnmount(() => { disposed = true; generation++; clearTimeout(timer); observer?.disconnect(); markers.forEach(marker => marker.remove()); map?.remove(); });
</script>

<template>
  <div class="rd-collection-map">
    <div ref="container" class="rd-collection-map__surface" role="region" aria-label="Bản đồ các địa điểm trong bộ sưu tập" />
    <button v-if="!loading && !failed" type="button" class="rd-collection-map__fit" @click="fit">↗ Xem tất cả điểm</button>
    <p v-if="loading" class="rd-collection-map__notice" role="status">Đang mở bản đồ…</p>
    <div v-if="failed" class="rd-collection-map__notice" role="status"><p>Chưa tải được bản đồ. Bạn vẫn có thể xem từng địa điểm trong danh sách.</p><button type="button" class="rd-btn rd-btn--outline" @click="retry">Thử lại bản đồ</button></div>
  </div>
</template>

<style scoped>
.rd-collection-map { position: relative; min-width: 0; height: clamp(340px, 45vw, 480px); background: var(--map-land); }
.rd-collection-map__surface { width: 100%; height: 100%; }
.rd-collection-map__fit { position: absolute; left: var(--space-3); bottom: var(--space-10); min-height: var(--tap-min); padding: var(--space-2) var(--space-3); background: var(--paper-raised); border: var(--border-ink); color: var(--ink); font: 600 11px var(--font-body); border-radius: var(--radius-note); cursor: pointer; }
.rd-collection-map__notice { position: absolute; top: var(--space-3); left: var(--space-3); right: var(--space-16); padding: var(--space-4); background: var(--paper-raised); border: var(--border); font: 400 13px/1.7 var(--font-body); }
.rd-collection-map__notice p { margin-top: 0; }
.rd-collection-map :deep(.rd-collection-pin) { width: var(--tap-min); height: var(--tap-min); display: grid; place-items: center; border: 2px solid var(--paper-raised); border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); box-shadow: var(--shadow-float); font: 600 13px var(--font-coordinate); cursor: pointer; }
.rd-collection-map :deep(.rd-collection-pin[aria-pressed='true']) { z-index: 1; background: var(--accent); color: var(--ink); outline: 2px solid var(--ink); outline-offset: 3px; }
.rd-collection-map :deep(.maplibregl-ctrl button) { width: var(--tap-min); height: var(--tap-min); }
</style>
