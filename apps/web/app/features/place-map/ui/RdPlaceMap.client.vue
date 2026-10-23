<script setup lang="ts">
import { MAP_FOCUS_DURATION_MS } from '~/shared/lib/map-camera';
import type { BBox, CityPublic, PlaceCard } from '@ranhduong/contracts';
import type { GeoJSONSource, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { intersectMapBounds } from '~/entities/place/lib/map-places';
import { placePinSvg } from '~/entities/place/lib/map-pin';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { useClientNow } from '~/shared/lib/use-client-now';
import { resolveMapStyleSprites } from '~/shared/lib/map-style';
import { MAP_MIN_ZOOM, needsPan, pointBounds, type MapInsets, type MapView } from '~/shared/lib/map-camera';
import { addPlaceLayers, CLUSTERS, PLACE_SOURCE, POINTS, selectPlaceLayer, updatePlaceLayers } from '../lib/map-layers';

/** initialView: khung nhìn khôi phục khi quay lại trang; insets: phần header và sheet đang che bản đồ (px). */
const props = defineProps<{ city: CityPublic; places: PlaceCard[]; selectedSlug: string | null; initialView?: MapView; insets?: MapInsets; fitInitialPlaces?: boolean; journal?: boolean; focusKey?: number; focusInitialSelection?: boolean }>();
const emit = defineEmits<{ viewport: [bbox: BBox, interactive: boolean]; select: [slug: string]; camera: [view: MapView]; ready: []; error: [] }>();
const styleUrl = useRuntimeConfig().public.mapStyleUrl;
const container = ref<HTMLDivElement | null>(null);
const failed = ref(false);
const loading = ref(true);
const assetsFailed = ref(false);
const now = useClientNow();
const previewSlug = ref<string | null>(null);
const previewPlace = computed(() => props.places.find((place) => place.slug === previewSlug.value));
const previewHost = shallowRef<HTMLDivElement | null>(null);
let map: MapLibreMap | undefined;
let maplibre: typeof import('maplibre-gl') | undefined;
let selectedMarker: Marker | undefined;
let previewPopup: Popup | undefined;
let previewMedia: MediaQueryList | undefined;
let hoveredSlug: string | null = null;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
let generation = 0;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let containerResize: ResizeObserver | undefined;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const padding = () => ({ top: props.insets?.top ?? 0, bottom: props.insets?.bottom ?? 0, left: 0, right: 0 });

function closePreview(): void {
  clearTimeout(previewTimer);
  clearTimeout(closeTimer);
  previewSlug.value = null;
  previewHost.value = null;
  previewPopup?.remove();
  previewPopup = undefined;
}

function keepPreview(): void {
  clearTimeout(previewTimer);
  clearTimeout(closeTimer);
}

function schedulePreviewClose(): void {
  clearTimeout(previewTimer);
  // Cho phép đưa chuột từ ghim sang thẻ và đọc thẻ bằng bàn phím.
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (!previewPopup?.getElement()?.matches(':hover, :focus-within')) closePreview();
  }, 220);
}

async function openPreview(slug: string): Promise<void> {
  const place = props.places.find((item) => item.slug === slug);
  if (!previewMedia?.matches || !map || !maplibre || map.isMoving() || !place?.location) return;
  if (previewSlug.value === slug) { keepPreview(); return; }
  closePreview();
  const host = document.createElement('div');
  previewHost.value = host;
  previewSlug.value = slug;
  const popup = new maplibre.Popup({
    closeButton: false, closeOnClick: false, focusAfterOpen: false,
    className: 'rd-map-preview', maxWidth: '320px', padding: { top: 12, bottom: 12, left: 12, right: 12 },
    offset: {
      center: [0, -24], top: [0, 8], 'top-left': [0, 8], 'top-right': [0, 8],
      bottom: [0, -50], 'bottom-left': [0, -50], 'bottom-right': [0, -50],
      left: [24, -24], right: [-24, -24],
    },
  }).setLngLat(place.location.coordinates).setDOMContent(host);
  previewPopup = popup;
  // Chờ Vue render nội dung để MapLibre chọn phía còn đủ chỗ sát mép bản đồ.
  await nextTick();
  if (disposed || previewPopup !== popup || !map) return;
  popup.addTo(map);
}

function hoverPlace(slug: string | null): void {
  if (!previewMedia?.matches) return;
  if (slug === hoveredSlug) {
    if (slug && previewSlug.value === slug) keepPreview();
    return;
  }
  hoveredSlug = slug;
  clearTimeout(previewTimer);
  if (!slug) { schedulePreviewClose(); return; }
  keepPreview();
  previewTimer = setTimeout(() => { void openPreview(slug); }, 160);
}

function dismissPreview(event: KeyboardEvent): void {
  if (event.key === 'Escape') closePreview();
}

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
    button.addEventListener('click', (event) => { event.stopPropagation(); closePreview(); emit('select', place.slug); });
    button.addEventListener('mouseenter', () => hoverPlace(place.slug));
    button.addEventListener('mouseleave', () => hoverPlace(null));
    button.addEventListener('focus', () => { void openPreview(place.slug); });
    button.addEventListener('blur', schedulePreviewClose);
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

function emitViewport(interactive = false): void {
  if (!map) return;
  const center = map.getCenter();
  emit('camera', { center: [center.lng, center.lat], zoom: map.getZoom() });
  const bounds = map.getBounds();
  const clipped = intersectMapBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], props.city.mapBounds);
  if (clipped) emit('viewport', clipped, interactive);
}

async function start(): Promise<void> {
  const currentGeneration = ++generation;
  const previous = props.journal && map ? { center: [map.getCenter().lng, map.getCenter().lat] as [number, number], zoom: map.getZoom() } : undefined;
  const startView = previous ?? props.initialView;
  closePreview();
  hoveredSlug = null;
  selectedMarker?.remove(); selectedMarker = undefined;
  map?.remove();
  map = undefined;
  clearTimeout(startupTimer);
  failed.value = false;
  loading.value = true;
  assetsFailed.value = false;
  let assetsLoaded = false;
  try {
    const [library, , worker] = await Promise.all([
      import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
    ]);
    assetsLoaded = true;
    if (disposed || currentGeneration !== generation || !container.value) return;
    maplibre = library;
    library.setWorkerUrl(worker.default);
    const element = container.value;
    const instance = new library.Map({
      container: element, center: startView?.center ?? props.city.center.coordinates, zoom: startView?.zoom ?? 12,
      minZoom: MAP_MIN_ZOOM, maxBounds: props.city.mapBounds, attributionControl: false,
      dragRotate: false, pitchWithRotate: false,
      locale: { 'NavigationControl.ZoomIn': 'Phóng to', 'NavigationControl.ZoomOut': 'Thu nhỏ' },
    });
    map = instance;
    instance.touchZoomRotate.disableRotation();
    if (props.journal) instance.keyboard.disableRotation();
    instance.addControl(new library.NavigationControl({ showCompass: false }), 'top-right');
    if (props.journal) instance.addControl(new library.ScaleControl({ unit: 'metric', maxWidth: 100 }), 'bottom-left');
    let viewportReady = false;
    const reportError = () => {
      if (disposed || instance !== map) return;
      closePreview();
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
      // Khung nhìn khôi phục đã chứa ghim đang chọn; chỉ canh giữa khi mở mới.
      if (chosen?.location && (!startView || props.focusInitialSelection)) instance.jumpTo({ center: chosen.location.coordinates, padding: padding() });
      else if (props.fitInitialPlaces && !startView) {
        const bounds = pointBounds(props.places.flatMap(place => place.location ? [place.location.coordinates] : []), props.city.mapBounds);
        if (bounds) instance.fitBounds(bounds, { padding: { top: padding().top + 48, bottom: padding().bottom + 48, left: 48, right: 48 }, maxZoom: 14, duration: 0 });
      }
      viewportReady = true;
      loading.value = false;
      // MapLibre may emit load after a sprite failure; retain the notice until retry.
      if (!failed.value) emit('ready');
      emitViewport();
    });
    instance.on('moveend', event => { if (viewportReady) emitViewport(Boolean(event.originalEvent)); });
    instance.on('movestart', () => { closePreview(); hoveredSlug = null; });
    instance.getCanvas().addEventListener('mouseleave', () => hoverPlace(null));
    instance.on('click', async (event) => {
      closePreview();
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
        if (lng !== undefined && lat !== undefined) instance.easeTo({ center: [lng, lat], zoom, padding: padding(), duration: reducedMotion() ? 0 : MAP_FOCUS_DURATION_MS }, { originalEvent: event.originalEvent });
      } catch { reportError(); }
    });
    instance.on('mousemove', (event) => {
      if (!instance.getLayer(POINTS)) return;
      // Ghim đang chọn là HTML, không còn trong layer POINTS để queryRenderedFeatures tìm thấy.
      const marker = event.originalEvent.target instanceof Element ? event.originalEvent.target.closest<HTMLElement>('.rd-map-pin') : null;
      if (marker) { hoverPlace(marker.dataset.slug ?? null); return; }
      const hits = instance.queryRenderedFeatures(event.point, { layers: [POINTS, CLUSTERS] });
      instance.getCanvas().style.cursor = hits.length ? 'pointer' : '';
      const point = hits.find((hit) => typeof hit.properties.slug === 'string');
      hoverPlace(point ? point.properties.slug as string : null);
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
  // Một phản hồi mới vẫn chứa cùng ghim phải giữ cả thẻ đang mở lẫn hover đang chờ.
  if ((previewSlug.value && !places.some((place) => place.slug === previewSlug.value))
    || (hoveredSlug && !places.some((place) => place.slug === hoveredSlug))) {
    closePreview(); hoveredSlug = null;
  }
  if (!map?.getSource(PLACE_SOURCE)) return;
  updatePlaceLayers(map, places, props.selectedSlug);
  syncSelectedMarker();
});
watch(() => [props.selectedSlug, props.focusKey] as const, ([slug]) => {
  closePreview();
  if (!map?.getLayer(POINTS)) return;
  syncSelectedMarker();
  const place = props.places.find((item) => item.slug === slug);
  if (!place?.location) return;
  // Chỉ dịch khi ghim bị header, sheet hoặc mép màn hình che, tránh bản đồ nhảy mỗi lần chọn.
  const canvas = map.getCanvas();
  const point = map.project(place.location.coordinates);
  if (needsPan(point, { width: canvas.clientWidth, height: canvas.clientHeight }, padding())) {
    map.easeTo({ center: place.location.coordinates, padding: padding(), duration: reducedMotion() ? 0 : MAP_FOCUS_DURATION_MS });
  }
});
onMounted(() => {
  previewMedia = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  previewMedia.addEventListener('change', closePreview);
  document.addEventListener('keydown', dismissPreview);
  if (props.journal && typeof ResizeObserver === 'function') {
    containerResize = new ResizeObserver(() => { if (container.value?.clientWidth && container.value.clientHeight) map?.resize(); });
    if (container.value) containerResize.observe(container.value);
  }
  void start();
});
onBeforeUnmount(() => {
  disposed = true; generation++; clearTimeout(startupTimer); closePreview();
  previewMedia?.removeEventListener('change', closePreview);
  document.removeEventListener('keydown', dismissPreview);
  containerResize?.disconnect();
  selectedMarker?.remove(); map?.remove();
});
</script>

<template>
  <div class="rd-map-canvas" :class="{ 'rd-map-canvas--journal': journal }">
    <div ref="container" class="rd-map-canvas__surface" role="region" :aria-label="`Bản đồ địa điểm ${city.name}`" />
    <Teleport v-if="previewPlace && previewHost" :to="previewHost">
      <div class="rd-map-preview__card" :aria-label="`Xem nhanh: ${previewPlace.name}`" @mouseenter="keepPreview" @mouseleave="schedulePreviewClose" @focusin="keepPreview" @focusout="schedulePreviewClose">
        <RdPlaceCard :place="previewPlace" :href="`/${city.slug}/dia-diem/${previewPlace.slug}`" :now="now" compact />
      </div>
    </Teleport>
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
.rd-map-canvas__notice { position: absolute; top: calc(var(--map-controls-top, 0px) + var(--space-3)); left: var(--space-3); right: calc(var(--tap-min) + var(--space-5)); padding: var(--space-3); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); font-size: 14px; }
.rd-map-canvas__notice p { margin-top: 0; }
.rd-map-preview__card { width: 320px; font: 14px/1.5 var(--font-body); }
.rd-map-preview__card :deep(.rd-place) { height: auto; border: var(--border-ink); }
.rd-map-preview__card :deep(.rd-place__title) { overflow-wrap: anywhere; }
.rd-map-canvas :deep(.rd-map-preview .maplibregl-popup-content) { padding: 0; background: var(--paper-raised); border-radius: var(--radius-card); box-shadow: var(--shadow-float); }
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-bottom .maplibregl-popup-tip),
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip),
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip) { border-top-color: var(--ink); }
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-top .maplibregl-popup-tip),
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-top-left .maplibregl-popup-tip),
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-top-right .maplibregl-popup-tip) { border-bottom-color: var(--ink); }
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-left .maplibregl-popup-tip) { border-right-color: var(--ink); }
.rd-map-canvas :deep(.rd-map-preview.maplibregl-popup-anchor-right .maplibregl-popup-tip) { border-left-color: var(--ink); }
/* Nút zoom nằm dưới header nổi của trang bản đồ (--map-controls-top do trang đặt). */
.rd-map-canvas :deep(.maplibregl-ctrl-top-right) { top: var(--map-controls-top, 0px); }
.rd-map-canvas :deep(.maplibregl-ctrl-bottom-left) { bottom: var(--map-controls-bottom, 0px); }
.rd-map-canvas :deep(.maplibregl-ctrl-scale) { color: var(--ink); border-color: var(--ink); background: var(--paper-raised); font-family: var(--font-coordinate); font-size: 10px; }
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
.rd-map-canvas--journal :deep(.rd-map-pin__graphic) { animation: rd-map-discover var(--dur-reveal) var(--ease-route) both; }
@keyframes rd-map-discover { from { opacity: 0.5; transform: translate(-6px, -12px) rotate(-6deg); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .rd-map-canvas :deep(.rd-map-pin__graphic) { animation: none; }
}
</style>
