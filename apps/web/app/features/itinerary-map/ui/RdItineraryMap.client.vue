<script setup lang="ts">
import type { CityPublic, ItineraryPublicStop } from '@ranhduong/contracts';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { needsPan } from '~/shared/lib/map-camera';
import { resolveMapStyleSprites } from '~/shared/lib/map-style';
import { itineraryFitPadding, itineraryMapData } from '../lib/map-data';

const props = defineProps<{ city: CityPublic; stops: ItineraryPublicStop[]; selectedKey: string | null; focusRequest?: number }>();
const emit = defineEmits<{ select: [key: string] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const container = ref<HTMLDivElement | null>(null);
const tools = ref<HTMLElement | null>(null);
const loading = ref(true);
const failed = ref(false);
const connections = ref(false);
let resizeObserver: ResizeObserver | undefined;
let drawnStops: ItineraryPublicStop[] | undefined;
let pendingFit = false;
let map: MapLibreMap | undefined;
let markers: Marker[] = [];
let maplibre: typeof import('maplibre-gl') | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
let generation = 0;
let assetsFailed = false;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function highlight(): void {
  for (const marker of markers) {
    const button = marker.getElement();
    button.classList.toggle('rd-itinerary-marker--selected', button.dataset.stopKey === props.selectedKey);
    button.setAttribute('aria-pressed', String(button.dataset.stopKey === props.selectedKey));
  }
}
function fitDay(): void {
  pendingFit = true;
  if (!map || !maplibre) return;
  const canvas = map.getCanvas();
  if (canvas.clientWidth < 1 || canvas.clientHeight < 1) return;
  const data = itineraryMapData(props.stops);
  pendingFit = false;
  if (!data.points.length) return;
  const bounds = new maplibre.LngLatBounds();
  data.points.forEach(point => bounds.extend(point.coordinates));
  map.fitBounds(bounds, { padding: itineraryFitPadding(canvas.clientWidth, canvas.clientHeight, tools.value?.offsetHeight ?? 0), maxZoom: 14, duration: reducedMotion() ? 0 : 250 });
}
function focusSelected(): void {
  const point = itineraryMapData(props.stops).points.find(item => item.key === props.selectedKey);
  if (map && point) map.easeTo({ center: point.coordinates, duration: reducedMotion() ? 0 : 280 });
}
function draw(): void {
  if (!map || !maplibre || !container.value || !map.getSource('rd-itinerary-route')) return;
  markers.forEach((marker) => marker.remove());
  markers = [];
  const data = itineraryMapData(props.stops);
  (map.getSource('rd-itinerary-route') as GeoJSONSource).setData(data.route);
  const duplicates = new Map<string, number>();
  const lastNumber = props.stops.at(-1)?.number;
  for (const point of data.points) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rd-itinerary-marker';
    button.classList.toggle('rd-itinerary-marker--last', point.number === lastNumber);
    button.dataset.stopKey = point.key;
    const graphic = document.createElement('span');
    graphic.className = 'rd-itinerary-marker__graphic';
    graphic.textContent = String(point.number);
    graphic.setAttribute('aria-hidden', 'true');
    button.append(graphic);
    button.setAttribute('aria-label', `Điểm ${point.number}: ${point.name}`);
    button.addEventListener('click', () => emit('select', point.key));
    // Repeated visits stay independently selectable at the same coordinates.
    const coordinateKey = point.coordinates.join(',');
    const repeat = duplicates.get(coordinateKey) ?? 0;
    duplicates.set(coordinateKey, repeat + 1);
    const marker = new maplibre.Marker({ element: button, offset: [repeat * 46, 0] }).setLngLat(point.coordinates).addTo(map);
    markers.push(marker);
  }
  highlight();
  drawnStops = props.stops;
  fitDay();
}
async function start(): Promise<void> {
  const current = ++generation;
  clearTimeout(timer);
  markers.forEach((marker) => marker.remove());
  markers = [];
  map?.remove(); map = undefined;
  loading.value = true; failed.value = false; assetsFailed = false;
  let loaded = false;
  try {
    const [library, , worker] = await Promise.all([
      import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
    ]);
    loaded = true;
    if (disposed || current !== generation || !container.value) return;
    maplibre = library;
    library.setWorkerUrl(worker.default);
    const instance = new library.Map({
      container: container.value, center: props.city.center.coordinates, zoom: 12,
      minZoom: 11, maxBounds: props.city.mapBounds, attributionControl: false, dragRotate: false, pitchWithRotate: false,
      locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ' },
    });
    map = instance;
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();
    instance.addControl(new library.NavigationControl({ showCompass: false }), 'top-right');
    const reportError = () => { if (!disposed && map === instance) { failed.value = true; loading.value = false; } };
    timer = setTimeout(reportError, 15_000);
    instance.on('error', reportError);
    instance.on('load', () => {
      if (disposed || map !== instance) return;
      clearTimeout(timer);
      const ink = getComputedStyle(container.value!).getPropertyValue('--ink').trim();
      instance.addSource('rd-itinerary-route', { type: 'geojson', data: itineraryMapData([]).route });
      instance.addLayer({ id: 'rd-itinerary-line', type: 'line', source: 'rd-itinerary-route', layout: { visibility: connections.value ? 'visible' : 'none' }, paint: { 'line-color': ink, 'line-width': 2, 'line-dasharray': [2, 2] } });
      loading.value = false;
      void nextTick(() => { if (!disposed && map === instance) draw(); });
    });
    instance.setStyle(styleUrl, { transformStyle: (_previous, next) => resolveMapStyleSprites(next, styleUrl, window.location.href) });
  } catch {
    if (disposed || current !== generation) return;
    assetsFailed = !loaded; failed.value = true; loading.value = false;
  }
}
function retry(): void { if (assetsFailed) window.location.reload(); else void start(); }
watch(() => [props.stops, props.selectedKey, props.focusRequest] as const, ([stops]) => {
  if (stops !== drawnStops) { draw(); return; }
  highlight();
  const stop = props.stops.find((item) => item.key === props.selectedKey);
  if (!map || !stop?.place?.location) return;
  // Dải thẻ đổi điểm liên tục khi vuốt: chỉ dịch khi ghim đang ra ngoài khung nhìn.
  const canvas = map.getCanvas();
  const point = map.project(stop.place.location.coordinates);
  if (needsPan(point, { width: canvas.clientWidth, height: canvas.clientHeight }, { top: 0, bottom: 0 })) {
    map.easeTo({ center: stop.place.location.coordinates, duration: reducedMotion() ? 0 : 250 });
  }
});
watch(connections, value => { if (map?.getLayer('rd-itinerary-line')) map.setLayoutProperty('rd-itinerary-line', 'visibility', value ? 'visible' : 'none'); });
onMounted(() => {
  void start();
  if (container.value && typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      if (!container.value?.clientWidth || !container.value.clientHeight) return;
      map?.resize();
      if (pendingFit) fitDay();
    });
    resizeObserver.observe(container.value);
  }
});
onBeforeUnmount(() => { disposed = true; generation++; clearTimeout(timer); resizeObserver?.disconnect(); markers.forEach((marker) => marker.remove()); map?.remove(); });
</script>

<template>
  <div class="rd-itinerary-map">
    <div ref="container" class="rd-itinerary-map__surface" role="region" aria-label="Bản đồ đánh số các điểm trong ngày" />
    <div v-if="!loading && !failed" ref="tools" class="rd-itinerary-map__tools" aria-label="Điều khiển bản đồ">
      <button type="button" :disabled="!stops.some(stop => stop.place?.location)" @click="fitDay">Vừa khung ngày</button>
      <button type="button" :disabled="!stops.some(stop => stop.key === selectedKey && stop.place?.location)" @click="focusSelected">Điểm đang chọn</button>
      <label><input v-model="connections" type="checkbox"> Nối thứ tự ghé <span>(không phải đường đi)</span></label>
    </div>
    <p v-if="loading" class="rd-itinerary-map__notice" role="status">Đang mở bản đồ…</p>
    <div v-if="failed" class="rd-itinerary-map__notice" role="status">
      <p>Chưa tải được bản đồ. Bạn vẫn xem lịch giờ và bấm Chỉ đường từng điểm.</p>
      <button type="button" class="rd-btn rd-btn--outline" @click="retry">Thử lại bản đồ</button>
    </div>
  </div>
</template>

<style scoped>
.rd-itinerary-map { position: relative; height: var(--itinerary-map-h, 360px); }
.rd-itinerary-map__surface { width: 100%; height: 100%; background: var(--map-land); }
.rd-itinerary-map__tools { position: absolute; z-index: 1; left: var(--space-2); bottom: var(--space-2); max-width: calc(100% - 16px); display: flex; flex-wrap: wrap; gap: var(--space-1); padding: var(--space-1); background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-note); }
.rd-itinerary-map__tools button, .rd-itinerary-map__tools label { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); color: var(--ink); font: 500 11px/1.5 var(--font-body); border: 0; padding: var(--space-1) var(--space-2); background: var(--paper-raised); cursor: pointer; }
.rd-itinerary-map__tools button { border-bottom: var(--border); }
.rd-itinerary-map__tools button:disabled { opacity: .5; cursor: default; }
.rd-itinerary-map__tools label { flex-wrap: wrap; }
.rd-itinerary-map__tools input { accent-color: var(--ink); }
.rd-itinerary-map__tools label span { font-weight: 400; }
.rd-itinerary-map__tools :is(button, input):focus-visible { outline: 3px solid var(--ink); outline-offset: 1px; }
.rd-itinerary-map__notice { position: absolute; top: var(--space-3); left: var(--space-3); right: calc(var(--tap-min) + var(--space-5)); background: var(--paper-raised); padding: var(--space-3); border: var(--border); border-radius: var(--radius-card); font-size: 14px; }
.rd-itinerary-map__notice p { margin-top: 0; }
.rd-itinerary-map :deep(.rd-itinerary-marker) { width: var(--tap-min); height: var(--tap-min); padding: 0; border: 0; background: transparent; cursor: pointer; }
.rd-itinerary-map :deep(.rd-itinerary-marker__graphic) { box-sizing: border-box; display: grid; place-items: center; width: 100%; height: 100%; background: var(--ink); color: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-pill); font: 700 20px var(--font-body); pointer-events: none; }
.rd-itinerary-map :deep(.rd-itinerary-marker--last .rd-itinerary-marker__graphic), .rd-itinerary-map :deep(.rd-itinerary-marker--selected .rd-itinerary-marker__graphic) { background: var(--accent); color: var(--ink); }
.rd-itinerary-map :deep(.rd-itinerary-marker--selected) { z-index: 1; }
.rd-itinerary-map :deep(.rd-itinerary-marker--selected .rd-itinerary-marker__graphic) { outline: 3px solid var(--ink); outline-offset: 3px; animation: rd-itinerary-pin-drop 700ms ease-out both; }
@keyframes rd-itinerary-pin-drop {
  0% { transform: translateY(-6px) scale(.95); }
  70% { transform: translateY(1px); }
  100% { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .rd-itinerary-map :deep(.rd-itinerary-marker__graphic) { animation: none; transform: none; }
}
.rd-itinerary-map :deep(.maplibregl-ctrl button) { width: var(--tap-min); height: var(--tap-min); }
.rd-itinerary-map :deep(.maplibregl-ctrl-group) { background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-chip); box-shadow: none; }
@media (max-height: 530px) and (max-width: 1023.98px) { .rd-itinerary-map__tools label { display: none; } }
</style>
