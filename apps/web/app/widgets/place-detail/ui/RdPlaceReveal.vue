<script setup lang="ts">
import { CATEGORY_LABEL, type PlaceDetail } from '@ranhduong/contracts';
import { computed, ref } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import { coordinateLabel } from '~/entities/place/lib/place-story';
import RdCategoryGlyph from '~/entities/place/ui/RdCategoryGlyph.vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';

const props = defineProps<{ place: PlaceDetail; citySlug: string; cityName: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const photo = computed(() => props.place.photos[0]);
const failed = ref(false);
const coordinates = computed(() => coordinateLabel(props.place.location));
const directions = computed(() => directionHref(props.place));
const closed = computed(() => props.place.status === 'closed');
const categories = computed(() => [props.place.category, ...props.place.alsoCategories].map(category => CATEGORY_LABEL[category]).join(' / '));
</script>

<template>
  <header id="place-reveal" class="rd-place-reveal" data-rd-route-scene>
    <div class="rd-place-reveal__media">
      <figure>
        <div class="rd-place-reveal__window">
          <img v-if="photo && !failed" :src="photoUrl(mediaBase, photo.key, 1200)" :srcset="photoSrcset(mediaBase, photo.key)" sizes="(min-width: 1024px) 60vw, 100vw" :alt="`${place.name} — ảnh từ ghi chép địa điểm`" width="1200" height="800" loading="eager" fetchpriority="high" decoding="async" @error="failed = true">
          <div v-else class="rd-place-reveal__placeholder"><RdCategoryGlyph :category="place.category" /><p>Ảnh đang cập nhật</p><span>Mỗi nơi, một câu chuyện.</span></div>
          <span class="rd-place-reveal__stamp"><RdCompass /><span>{{ CATEGORY_LABEL[place.category] }}<small>{{ cityName || 'Ghi chép địa phương' }}</small></span></span>
          <svg class="rd-place-reveal__route" viewBox="0 0 340 180" fill="none" aria-hidden="true"><path pathLength="1000" d="M10 155C60 160 40 55 120 85S190 190 240 110 280 20 325 28" /><circle cx="325" cy="28" r="6" /></svg>
        </div>
        <figcaption><span>RÀNH ĐƯỜNG / PLACE STORY</span><a v-if="photo" href="#photo-journal">Ảnh: {{ photo.credit }} · Xem nguồn ↗</a><span v-else>Chưa có ảnh địa điểm</span></figcaption>
      </figure>
    </div>
    <div class="rd-place-reveal__copy">
      <RdChapterLabel number="01" label="Mỗi nơi, một câu chuyện" />
      <p class="rd-place-reveal__location">{{ categories }}<template v-if="place.zoneName && place.zoneSlug"> · <NuxtLink :to="`/${citySlug}/khu-vuc/${place.zoneSlug}`">{{ place.zoneName }}</NuxtLink></template></p>
      <div class="rd-place-reveal__mask"><h1>{{ place.name }}</h1></div>
      <p class="rd-place-reveal__annotation">{{ closed ? 'Một trang ghi chép được giữ lại.' : 'Một nơi đáng để rẽ vào.' }}</p>
      <p v-if="place.address" class="rd-place-reveal__address"><span aria-hidden="true">⌖</span> {{ place.address }}</p>
      <p v-if="coordinates" class="rd-place-reveal__coordinates">{{ coordinates }}</p>
      <slot />
      <div v-if="!closed" class="rd-place-reveal__actions">
        <button type="button" class="rd-btn rd-btn--primary" disabled aria-describedby="place-itinerary-availability">Thêm vào lịch trình <small>Sắp có</small></button>
        <a v-if="directions" class="rd-btn rd-btn--outline" :href="directions" target="_blank" rel="noopener noreferrer" data-rd-event="direction_click" :data-rd-place-id="place.id">Chỉ đường <span aria-hidden="true">↗</span></a>
      </div>
      <a class="rd-place-reveal__continue" :href="closed ? '#next-turn' : '#before-you-go'">{{ closed ? 'Xem các chỗ tương tự' : 'Trước khi ghé, biết một chút' }} <span aria-hidden="true">↓</span></a>
    </div>
  </header>
</template>

<style scoped>
.rd-place-reveal { display: grid; gap: var(--space-7); }
.rd-place-reveal__media { min-width: 0; }.rd-place-reveal figure { margin: 0; }
.rd-place-reveal__window { position: relative; overflow: hidden; background: var(--mist); border-radius: var(--radius-postcard); aspect-ratio: 16 / 10; animation: rd-place-window var(--dur-route) var(--ease-route) both; }
.rd-place-reveal img { display: block; width: 100%; height: 100%; object-fit: cover; animation: rd-place-depth var(--dur-route-image) var(--ease-route) both; }
.rd-place-reveal__placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); background-image: var(--cartographic-grid); background-size: 32px 32px; }.rd-place-reveal__placeholder :deep(svg) { width: 54px; height: 54px; }.rd-place-reveal__placeholder p { font-size: 14px; margin: 0; }.rd-place-reveal__placeholder > span { font: 24px var(--font-hand); }
.rd-place-reveal__stamp { position: absolute; top: var(--space-4); right: var(--space-4); display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: var(--border-ink); background: var(--paper-raised); color: var(--ink); transform: rotate(4deg); font: 600 11px/1.7 var(--font-body); }.rd-place-reveal__stamp :deep(svg) { width: 36px; height: 36px; }.rd-place-reveal__stamp small { display: block; font-size: 10px; font-weight: 400; }
.rd-place-reveal__route { position: absolute; bottom: var(--space-3); left: var(--space-3); width: 40%; max-width: 270px; color: var(--paper-raised); filter: drop-shadow(0 1px 2px var(--ink)); pointer-events: none; }.rd-place-reveal__route path { stroke: currentColor; stroke-width: 2; stroke-dasharray: 1000; stroke-dashoffset: calc(1000 * (1 - var(--rd-route-progress, 1))); }.rd-place-reveal__route circle { stroke: currentColor; fill: var(--route-rust); stroke-width: 2; }
.rd-place-reveal figcaption { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); font-size: 10px; line-height: 1.7; color: var(--ink-soft); padding-top: var(--space-2); }.rd-place-reveal figcaption > span:first-child { font-family: var(--font-coordinate); letter-spacing: 0.06em; padding-top: var(--space-3); }.rd-place-reveal figcaption a { display: inline-flex; align-items: center; min-height: var(--tap-min); text-align: right; max-width: 60%; overflow-wrap: anywhere; }
.rd-place-reveal__copy { min-width: 0; display: flex; flex-direction: column; align-items: start; }.rd-place-reveal__copy :deep(.rd-chapter) { margin-bottom: var(--space-4); color: var(--route-rust); }
.rd-place-reveal__location { margin: 0 0 var(--space-2); font-size: 12px; line-height: 1.8; color: var(--ink-soft); }.rd-place-reveal__location a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-place-reveal__mask { overflow: hidden; max-width: 100%; }.rd-place-reveal h1 { margin: 0; padding-bottom: var(--space-2); font: 600 clamp(36px, 5.5vw, 76px)/1.12 var(--font-display); letter-spacing: -0.045em; overflow-wrap: anywhere; animation: rd-place-title var(--dur-route) var(--ease-route) both; }
.rd-place-reveal__annotation { margin: var(--space-2) 0 var(--space-5); color: var(--route-rust); font: 26px/1.4 var(--font-hand); }
.rd-place-reveal__address { font-size: 14px; line-height: 1.8; margin: 0; }.rd-place-reveal__coordinates { font: 11px/1.8 var(--font-coordinate); color: var(--ink-soft); margin: var(--space-2) 0; }
.rd-place-reveal__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-5); width: 100%; }.rd-place-reveal__actions .rd-btn { font-size: 12px; border-radius: var(--radius-postcard); padding-inline: var(--space-4); }.rd-place-reveal__actions small { font-size: 10px; border: 1px solid currentColor; border-radius: var(--radius-postcard); padding: 1px var(--space-1); }
.rd-place-reveal__continue { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--space-5); min-height: var(--tap-min); font-size: 12px; margin-top: var(--space-3); text-underline-offset: 5px; }.rd-place-reveal__continue span { font-size: 20px; }
@keyframes rd-place-window { from { clip-path: inset(0 0 8% 0); } to { clip-path: inset(0); } }
@keyframes rd-place-depth { from { transform: scale(1.04); } to { transform: scale(1); } }
@keyframes rd-place-title { from { transform: translateY(18%); } to { transform: none; } }
@media (min-width: 768px) { .rd-place-reveal__window { aspect-ratio: 16 / 8; } }
@media (min-width: 1024px) {
  .rd-place-reveal { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.15fr); gap: var(--space-12); align-items: center; }.rd-place-reveal__media { grid-column: 2; grid-row: 1; }.rd-place-reveal__copy { grid-column: 1; grid-row: 1; }.rd-place-reveal__window { aspect-ratio: 4 / 5; max-height: 660px; }.rd-place-reveal__stamp { top: var(--space-6); right: var(--space-6); }.rd-place-reveal__route { width: 60%; }
}
</style>
