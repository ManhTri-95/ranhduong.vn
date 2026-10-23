<script setup lang="ts">
import type { PlaceCategory, PlacePhoto } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdCategoryGlyph from './RdCategoryGlyph.vue';

const props = defineProps<{ photos: PlacePhoto[]; name: string; category: PlaceCategory }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref<number[]>([]);
const track = ref<HTMLElement>();
const viewer = ref<HTMLDialogElement>();
const viewerIndex = ref<number | null>(null);
const current = ref(0);
const hydrated = ref(false);
const selected = computed(() => viewerIndex.value === null ? undefined : props.photos[viewerIndex.value]);
let returnFocus: HTMLElement | null = null;
const sourceLabels: Record<PlacePhoto['source'], string> = {
  self: 'Rành Đường tự chụp', owner: 'Chủ địa điểm cung cấp', ctv: 'Cộng tác viên cung cấp',
  user: 'Người đóng góp cung cấp', cc: 'Creative Commons',
};

async function openViewer(event: MouseEvent, index: number): Promise<void> {
  if (!viewer.value?.showModal || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  returnFocus = event.currentTarget as HTMLElement;
  viewerIndex.value = index;
  await nextTick();
  viewer.value?.showModal();
}
function closeViewer(): void { viewer.value?.close(); }
function onClose(): void { viewerIndex.value = null; returnFocus?.focus(); returnFocus = null; }
function selectPhoto(step: number): void {
  if (viewerIndex.value === null || !props.photos.length) return;
  viewerIndex.value = (viewerIndex.value + step + props.photos.length) % props.photos.length;
}
function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); selectPhoto(event.key === 'ArrowRight' ? 1 : -1);
  }
}
function scrollPhoto(step: number): void {
  const index = Math.max(0, Math.min(props.photos.length - 1, current.value + step));
  const child = track.value?.children[index] as HTMLElement | undefined;
  if (child) track.value?.scrollTo({ left: child.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function syncScroll(): void {
  if (!track.value) return;
  let distance = Infinity;
  Array.from(track.value.children).forEach((child, index) => {
    const next = Math.abs((child as HTMLElement).offsetLeft - track.value!.scrollLeft);
    if (next < distance) { distance = next; current.value = index; }
  });
}
onMounted(() => { hydrated.value = true; });
onBeforeUnmount(() => { returnFocus = null; viewer.value?.close(); });
</script>

<template>
  <div class="rd-gallery" aria-label="Ảnh địa điểm">
    <div v-if="!photos.length" class="rd-gallery__empty"><RdCategoryGlyph :category="category" /><p>Ảnh đang cập nhật.<br><span>Mình sẽ bổ sung những góc nhìn thật của nơi này.</span></p></div>
    <template v-else>
      <div class="rd-gallery__heading"><p>{{ photos.length }} góc nhìn trong ghi chép</p><span>Chạm ảnh để xem trọn khung ↗</span></div>
      <ol ref="track" class="rd-gallery__track" @scroll.passive="syncScroll">
        <li v-for="(photo, index) in photos" :key="photo.key" class="rd-gallery__card" :class="{ 'rd-gallery__card--anchor': index === 0 }">
          <figure>
            <a :href="photoUrl(mediaBase, photo.key, 1200)" target="_blank" rel="noopener noreferrer" :aria-label="`Xem ảnh ${index + 1} của ${name}`" @click="openViewer($event, index)">
              <img v-if="!failed.includes(index)" :src="photoUrl(mediaBase, photo.key, 800)" :srcset="photoSrcset(mediaBase, photo.key)" sizes="(min-width: 1024px) 600px, (min-width: 768px) 50vw, 85vw" :alt="`Ảnh ${index + 1} của ${name}`" width="1200" height="800" loading="lazy" decoding="async" @error="failed.push(index)">
              <span v-else class="rd-gallery__placeholder"><RdCategoryGlyph :category="category" />Chưa tải được ảnh</span>
              <span class="rd-gallery__expand" aria-hidden="true">↗</span>
            </a>
            <figcaption><span>{{ String(index + 1).padStart(2, '0') }} / {{ String(photos.length).padStart(2, '0') }}</span><span>{{ photo.credit }}</span></figcaption>
          </figure>
        </li>
      </ol>
      <div v-if="photos.length > 1" class="rd-gallery__controls">
        <button type="button" class="rd-btn rd-btn--outline" :disabled="!hydrated || current === 0" aria-label="Cuộn đến ảnh trước" @click="scrollPhoto(-1)">←</button>
        <p v-if="hydrated" aria-live="polite" aria-atomic="true">Ảnh {{ current + 1 }} / {{ photos.length }}</p><p v-else>{{ photos.length }} ảnh</p>
        <button type="button" class="rd-btn rd-btn--outline" :disabled="!hydrated || current === photos.length - 1" aria-label="Cuộn đến ảnh tiếp theo" @click="scrollPhoto(1)">→</button>
      </div>
      <details open class="rd-gallery__credits">
        <summary>Nguồn ảnh ({{ photos.length }})</summary>
        <ol><li v-for="(photo, index) in photos" :key="photo.key">Ảnh {{ index + 1 }} · {{ sourceLabels[photo.source] }} · {{ photo.credit }} · {{ photo.license }} <a v-if="photo.sourceUrl" :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer">Xem nguồn ảnh {{ index + 1 }}</a></li></ol>
        <p>Ảnh được chuyển sang WebP và thay đổi kích thước; khung hiển thị có thể cắt ảnh. <NuxtLink to="/ghi-nguon#anh-dia-diem">Về quyền sử dụng ảnh</NuxtLink></p>
      </details>
    </template>
    <dialog ref="viewer" class="rd-gallery-viewer" aria-labelledby="photo-viewer-title" @close="onClose" @keydown="onKey" @click.self="closeViewer">
      <template v-if="selected && viewerIndex !== null">
        <header><h2 id="photo-viewer-title">{{ name }} <span>Ảnh {{ viewerIndex + 1 }} / {{ photos.length }}</span></h2><button type="button" class="rd-btn rd-btn--outline" autofocus aria-label="Đóng ảnh" @click="closeViewer">Đóng ×</button></header>
        <figure :key="selected.key" class="rd-gallery-viewer__figure">
          <img v-if="!failed.includes(viewerIndex)" :src="photoUrl(mediaBase, selected.key, 1200)" :alt="`Ảnh ${viewerIndex + 1} của ${name}`" width="1200" height="800" decoding="async" @error="failed.push(viewerIndex)">
          <p v-else class="rd-gallery-viewer__error" role="status">Chưa tải được ảnh này. Bạn vẫn có thể xem các ảnh khác.</p>
          <figcaption>{{ sourceLabels[selected.source] }} · {{ selected.credit }} · {{ selected.license }} <a v-if="selected.sourceUrl" :href="selected.sourceUrl" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a></figcaption>
        </figure>
        <div v-if="photos.length > 1" class="rd-gallery-viewer__controls"><button type="button" class="rd-btn rd-btn--outline" aria-label="Xem ảnh trước" @click="selectPhoto(-1)">← Ảnh trước</button><p role="status" aria-live="polite">{{ viewerIndex + 1 }} / {{ photos.length }}</p><button type="button" class="rd-btn rd-btn--outline" aria-label="Xem ảnh tiếp theo" @click="selectPhoto(1)">Ảnh sau →</button></div>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
.rd-gallery { min-width: 0; }
.rd-gallery__heading { display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-4); color: var(--ink-soft); font-size: 12px; line-height: 1.7; }
.rd-gallery__heading p { margin: 0; font: 22px/1.4 var(--font-hand); color: var(--route-rust); }
.rd-gallery__track { position: relative; list-style: none; padding: var(--space-2) var(--space-1) var(--space-5); margin: 0; display: flex; gap: var(--space-5); overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; }
.rd-gallery__card { flex: 0 0 86%; scroll-snap-align: start; min-width: 0; }
.rd-gallery figure { margin: 0; padding: var(--space-2); border: var(--border); border-radius: var(--radius-postcard); background: var(--paper-raised); box-shadow: var(--shadow-card); }
.rd-gallery__card a { display: block; position: relative; overflow: hidden; border-radius: var(--radius-postcard); }
.rd-gallery__card img, .rd-gallery__placeholder { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; background: var(--mist); transition: transform var(--dur-panel) var(--ease-out); }
.rd-gallery__expand { position: absolute; bottom: var(--space-2); right: var(--space-2); display: grid; place-items: center; width: var(--tap-min); height: var(--tap-min); border-radius: var(--radius-pill); color: var(--paper-raised); background: var(--ink); font-size: 22px; }
.rd-gallery figcaption { display: flex; justify-content: space-between; align-items: start; gap: var(--space-2); padding: var(--space-3) var(--space-1) var(--space-1); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.rd-gallery figcaption span:first-child { white-space: nowrap; font-family: var(--font-coordinate); color: var(--route-rust); }.rd-gallery figcaption span:last-child { text-align: right; }
.rd-gallery__placeholder, .rd-gallery__empty { display: flex; align-items: center; justify-content: center; gap: var(--space-3); color: var(--ink-soft); font-size: 14px; }.rd-gallery__placeholder { flex-direction: column; }
.rd-gallery__empty { min-height: 120px; background: var(--mist); padding: var(--space-6); border-radius: var(--radius-postcard); }.rd-gallery__empty p { margin: 0; line-height: 1.8; }.rd-gallery__empty span { font-size: 12px; }
.rd-gallery :deep(.rd-place__glyph) { flex-shrink: 0; width: 40px; height: 40px; }
.rd-gallery__controls { display: flex; align-items: center; justify-content: space-between; margin: var(--space-2) 0; font: 12px var(--font-coordinate); }.rd-gallery__controls button { min-width: var(--tap-min); padding: 0 var(--space-3); }.rd-gallery__controls p { margin: 0; }
.rd-gallery__credits { color: var(--ink-soft); font-size: 12px; line-height: 1.8; margin-top: var(--space-4); border-top: var(--border); }.rd-gallery__credits summary { display: flex; align-items: center; min-height: var(--tap-min); cursor: pointer; text-decoration: underline; }
.rd-gallery__credits ol { margin: 0; padding-left: var(--space-5); }.rd-gallery__credits li { overflow-wrap: anywhere; }.rd-gallery__credits p { margin: var(--space-2) 0 0; }.rd-gallery__credits a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-gallery-viewer { box-sizing: border-box; width: min(1100px, calc(100% - 24px)); max-height: calc(100dvh - 24px); padding: var(--space-4); color: var(--ink); background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-postcard); box-shadow: var(--shadow-postcard); }.rd-gallery-viewer::backdrop { background: color-mix(in srgb, var(--ink) 80%, transparent); }
.rd-gallery-viewer header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); }.rd-gallery-viewer h2 { margin: 0; font: 600 18px/1.5 var(--font-body); overflow-wrap: anywhere; }.rd-gallery-viewer h2 span { display: block; font: 12px/1.8 var(--font-coordinate); }.rd-gallery-viewer header button { flex-shrink: 0; padding: 0 var(--space-3); }
.rd-gallery-viewer__figure { margin: var(--space-4) 0 0; animation: rd-photo-view var(--dur-panel) var(--ease-out); }.rd-gallery-viewer__figure img { display: block; width: 100%; height: auto; max-height: 65dvh; object-fit: contain; background: var(--paper); }
.rd-gallery-viewer figcaption { font-size: 12px; line-height: 1.8; padding-block: var(--space-3); overflow-wrap: anywhere; }.rd-gallery-viewer figcaption a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-gallery-viewer__controls { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }.rd-gallery-viewer__controls p { font: 12px var(--font-coordinate); }.rd-gallery-viewer__controls button { font-size: 12px; padding-inline: var(--space-3); }.rd-gallery-viewer__error { min-height: 30vh; display: grid; place-items: center; padding: var(--space-5); background: var(--mist); }
@keyframes rd-photo-view { from { opacity: 0.65; transform: translateX(6px); } to { opacity: 1; transform: none; } }
@media (min-width: 768px) {
  .rd-gallery__track { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: visible; gap: var(--space-6); padding: var(--space-2) 0; align-items: start; }
  .rd-gallery__card--anchor { grid-column: 1 / -1; }.rd-gallery__card--anchor img { aspect-ratio: 16 / 9; }.rd-gallery__card:nth-child(3n + 2) { transform: rotate(-1deg); }.rd-gallery__card:nth-child(3n) { transform: rotate(1deg); margin-top: var(--space-6); }
  .rd-gallery__card:focus-within { transform: none; }.rd-gallery__controls { display: none; }
}
@media (min-width: 1024px) { .rd-gallery__track { grid-template-columns: repeat(3, minmax(0, 1fr)); }.rd-gallery__card--anchor { grid-column: span 2; grid-row: span 2; }.rd-gallery__card--anchor img { aspect-ratio: 4 / 3; } }
@media (hover: hover) { .rd-gallery__card a:hover img { transform: scale(1.03); } }
@media (prefers-reduced-motion: reduce) { .rd-gallery__card { transform: none !important; } }
</style>
