<script setup lang="ts">
import type { BBox, CityPublic, PlaceCard } from '@ranhduong/contracts';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { intersectMapBounds } from '~/entities/place/lib/map-places';
import { placePinSvg } from '~/entities/place/lib/map-pin';
import { resolveMapStyleSprites } from '~/shared/lib/map-style';
import { addPlaceLayers, CLUSTERS, PLACE_SOURCE, POINTS, selectPlaceLayer, updatePlaceLayers } from '../lib/map-layers';

const props = defineProps<{ city: CityPublic; places: PlaceCard[]; selectedSlug: string | null }>();
const emit = defineEmits<{ viewport: [bbox: BBox]; select: [slug: string]; ready: []; error: [] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const container = ref<HTMLDivElement | null>(null);
const failed = ref(false);
const loading = ref(true);
const assetsFailed = ref(false);
let map: MapLibreMap | undefined;
let maplibre: typeof import('maplibre-gl') | undefined;
let selectedMarker: Marker | undefined;
let disposed = false;
let generation = 0;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function syncSelectedMarker(): void {
  if (!map?.getLayer(POINTS) || !maplibre) return;
  const place = props.places.find((item) => item.slug === props.selectedSlug);
  selectPlaceLayer(map, place?.location ? place.slug : null);
  if (!place?.location) {
    selectedMarker?.remove(); selectedMarker = undefined;
    return;
  }
  if (selectedMarker?.getElement().dataset.slug !== place.slug) {
    selectedMarker?.remove();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rd-map-pin';
    button.dataset.slug = place.slug;
    button.setAttribute('aria-pressed', 'true');
    const graphic = document.createElement('span');
    graphic.className = 'rd-map-pin__graphic';
    button.append(graphic);
    button.addEventListener('click', (event) => { event.stopPropagation(); emit('select', place.slug); });
    selectedMarker = new maplibre.Marker({ element: button, anchor: 'bottom', offset: [0, 2.5] }).setLngLat(place.location.coordinates).addTo(map);
  }
  const button = selectedMarker.getElement();
  button.setAttribute('aria-label', `Đang chọn: ${place.name}`);
  if (button.dataset.category !== place.category) {
    // SVG is generated only from static, typed category paths; no place text is interpolated.
    button.firstElementChild!.innerHTML = placePinSvg(place.category);
    button.dataset.category = place.category;
  }
  selectedMarker.setLngLat(place.location.coordinates);
}

function emitViewport(): void {
  if (!map) return;
  const bounds = map.getBounds();
  const clipped = intersectMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], props.city.mapBounds);
  if (clipped) emit('viewport', clipped);
}

async function start(): Promise<void> {
  const currentGeneration = ++generation;
  selectedMarker?.remove(); selectedMarker = undefined;
  map?.remove();
  map = undefined;
  clearTimeout(startupTimer);
  failed.value = false;
  loading.value = true;
  assetsFailed.value = false;
  let assetsLoaded = false;
  try {
    const [library] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
    assetsLoaded = true;
    if (disposed || currentGeneration !== generation || !container.value) return;
    maplibre = library;
    library.setWorkerUrl(mapWorkerUrl);
    const element = container.value;
    const instance = new library.Map({
      container: element, center: props.city.center.coordinates, zoom: 12,
      minZoom: 11, maxBounds: props.city.mapBounds, attributionControl: false,
      dragRotate: false, pitchWithRotate: false,
      locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ' },
    });
    map = instance;
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new library.NavigationControl({ showCompass: false }), 'top-right');
    const reportError = () => {
      if (disposed || instance !== map) return;
      failed.value = true; loading.value = false; emit('error');
    };
    startupTimer = setTimeout(reportError, 15_000);
    instance.on('error', reportError);
    instance.on('load', () => {
      if (disposed || instance !== map) return;
      clearTimeout(startupTimer);
      addPlaceLayers(instance, props.places, element);
      updatePlaceLayers(instance, props.places, props.selectedSlug);
      syncSelectedMarker();
      const chosen = props.places.find((place) => place.slug === props.selectedSlug);
      if (chosen?.location) instance.jumpTo({ center: chosen.location.coordinates });
      loading.value = false;
      // MapLibre may emit load after a sprite failure; retain the notice until retry.
      if (!failed.value) emit('ready');
      emitViewport();
    });
    instance.on('moveend', emitViewport);
    instance.on('click', async (event) => {
      if (!instance.getLayer(POINTS)) return;
      // 44px quanh vị trí chạm, dễ chọn ghim nhỏ trên điện thoại.
      const hits = instance.queryRenderedFeatures([[event.point.x - 22, event.point.y - 22], [event.point.x + 22, event.point.y + 22]], { layers: [POINTS, CLUSTERS] });
      const point = hits.find((hit) => typeof hit.properties.slug === 'string');
      if (point) {
        emit('select', point.properties.slug as string);
        return;
      }
      const cluster = hits.find((hit) => typeof hit.properties.cluster_id === 'number');
      if (!cluster || cluster.geometry.type !== 'Point') return;
      try {
        const zoom = await (instance.getSource(PLACE_SOURCE) as GeoJSONSource).getClusterExpansionZoom(cluster.properties.cluster_id as number);
        if (disposed || instance !== map) return;
        const [lng, lat] = cluster.geometry.coordinates;
        if (lng !== undefined && lat !== undefined) instance.easeTo({ center: [lng, lat], zoom, duration: reducedMotion() ? 0 : 300 });
      } catch { reportError(); }
    });
    instance.on('mousemove', (event) => {
      if (!instance.getLayer(POINTS)) return;
      instance.getCanvas().style.cursor = instance.queryRenderedFeatures(event.point, { layers: [POINTS, CLUSTERS] }).length ? 'pointer' : '';
    });
    instance.setStyle(styleUrl, { transformStyle: (_previous, next) => resolveMapStyleSprites(next, styleUrl, window.location.href) });
  } catch {
    if (disposed || currentGeneration !== generation) return;
    assetsFailed.value = !assetsLoaded;
    failed.value = true;
    loading.value = false;
    emit('error');
  }
}

function retry(): void {
  // Trình duyệt giữ lỗi import() cho cùng URL; tải lại trang mới thử được chunk đã lỗi mạng.
  if (assetsFailed.value) window.location.reload();
  else void start();
}

watch(() => props.places, (places) => {
  if (!map?.getSource(PLACE_SOURCE)) return;
  updatePlaceLayers(map, places, props.selectedSlug);
  syncSelectedMarker();
});
watch(() => props.selectedSlug, (slug) => {
  if (!map?.getLayer(POINTS)) return;
  syncSelectedMarker();
  const place = props.places.find((item) => item.slug === slug);
  if (place?.location) map.easeTo({ center: place.location.coordinates, duration: reducedMotion() ? 0 : 250 });
});
onMounted(start);
onBeforeUnmount(() => { disposed = true; generation++; clearTimeout(startupTimer); selectedMarker?.remove(); map?.remove(); });
</script>

<template>
  <div class="rd-map-canvas">
    <div ref="container" class="rd-map-canvas__surface" role="region" :aria-label="`Bản đồ địa điểm ${city.name}`" />
    <p v-if="loading" class="rd-map-canvas__notice" role="status">Đang mở bản đồ…</p>
    <div v-if="failed" class="rd-map-canvas__notice" role="status">
      <p>Chưa tải được bản đồ. Bạn vẫn xem được danh sách địa điểm bên dưới.</p>
      <button type="button" class="rd-btn rd-btn--outline" @click="retry">Thử lại bản đồ</button>
    </div>
  </div>
</template>

<style scoped>
.rd-map-canvas, .rd-map-canvas__surface { width: 100%; height: 100%; }
.rd-map-canvas { position: relative; }
.rd-map-canvas__surface { background: var(--map-land); }
.rd-map-canvas__notice { position: absolute; top: var(--space-3); left: var(--space-3); right: calc(var(--tap-min) + var(--space-5)); padding: var(--space-3); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); font-size: 14px; }
.rd-map-canvas__notice p { margin-top: 0; }
.rd-map-canvas :deep(.maplibregl-ctrl button) { width: var(--tap-min); height: var(--tap-min); }
.rd-map-canvas :deep(.maplibregl-ctrl-group) { background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-chip); box-shadow: none; }
.rd-map-canvas :deep(.rd-map-pin) { width: 45px; height: 55px; padding: 0; border: 0; background: transparent; cursor: pointer; z-index: 1; }
.rd-map-canvas :deep(.rd-map-pin:focus-visible) { outline: var(--border-strong) solid var(--ink); outline-offset: var(--space-1); border-radius: var(--radius-chip); }
/* Animate the child, keeping MapLibre's positioning transform on the button intact. */
.rd-map-canvas :deep(.rd-map-pin__graphic) { display: block; width: 100%; height: 100%; pointer-events: none; animation: rd-pin-drop 700ms ease-out both; }
.rd-map-canvas :deep(.rd-map-pin__graphic svg) { display: block; width: 100%; height: 100%; }
@keyframes rd-pin-drop {
  0% { transform: translateY(-40px); }
  70% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .rd-map-canvas :deep(.rd-map-pin__graphic) { animation: none; }
}
</style>
