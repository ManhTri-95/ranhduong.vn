<script setup lang="ts">
import type { BBox, CityPublic, PlaceCard } from '@ranhduong/contracts';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { intersectMapBounds } from '~/entities/place/lib/map-places';
import { addPlaceLayers, CLUSTERS, PLACE_SOURCE, POINTS, updatePlaceLayers } from '../lib/map-layers';

const props = defineProps<{ city: CityPublic; places: PlaceCard[]; selectedSlug: string | null }>();
const emit = defineEmits<{ viewport: [bbox: BBox]; select: [slug: string]; ready: []; error: [] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const container = ref<HTMLDivElement | null>(null);
const failed = ref(false);
const loading = ref(true);
const assetsFailed = ref(false);
let map: MapLibreMap | undefined;
let disposed = false;
let generation = 0;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function emitViewport(): void {
  if (!map) return;
  const bounds = map.getBounds();
  const clipped = intersectMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], props.city.mapBounds);
  if (clipped) emit('viewport', clipped);
}

async function start(): Promise<void> {
  const currentGeneration = ++generation;
  map?.remove();
  map = undefined;
  clearTimeout(startupTimer);
  failed.value = false;
  loading.value = true;
  assetsFailed.value = false;
  let assetsLoaded = false;
  try {
    const [maplibre] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
    assetsLoaded = true;
    if (disposed || currentGeneration !== generation || !container.value) return;
    maplibre.setWorkerUrl(mapWorkerUrl);
    const element = container.value;
    const instance = new maplibre.Map({
      container: element, style: styleUrl, center: props.city.center.coordinates, zoom: 12,
      minZoom: 11, maxBounds: props.city.mapBounds, attributionControl: false,
      dragRotate: false, pitchWithRotate: false,
      locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ' },
    });
    map = instance;
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
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
      const chosen = props.places.find((place) => place.slug === props.selectedSlug);
      if (chosen?.location) instance.jumpTo({ center: chosen.location.coordinates });
      loading.value = false;
      failed.value = false;
      emit('ready');
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

watch(() => props.places, (places) => { if (map?.getSource(PLACE_SOURCE)) updatePlaceLayers(map, places, props.selectedSlug); });
watch(() => props.selectedSlug, (slug) => {
  if (!map?.getLayer('rd-selected')) return;
  map.setFilter('rd-selected', ['==', ['get', 'slug'], slug ?? '']);
  const place = props.places.find((item) => item.slug === slug);
  if (place?.location) map.easeTo({ center: place.location.coordinates, duration: reducedMotion() ? 0 : 250 });
});
onMounted(start);
onBeforeUnmount(() => { disposed = true; generation++; clearTimeout(startupTimer); map?.remove(); });
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
</style>
