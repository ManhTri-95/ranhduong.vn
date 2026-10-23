<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';

defineProps<{ citySlug: string; places: PlaceCard[]; failed: boolean; now: Date | null }>();
</script>

<template>
  <section class="section" data-rd-route-scene aria-labelledby="featured-places-title">
    <RdChapterLabel number="04" label="Bộ sưu tập những nơi hay" />
    <div class="rd-featured__heading"><h2 id="featured-places-title" class="section-title">Có những nơi<br>muốn ghé lại <em>lần nữa.</em></h2><NuxtLink class="rd-featured__all" :to="`/${citySlug}/ban-do`">Xem tất cả địa điểm <span aria-hidden="true">↗</span></NuxtLink></div>
    <ul v-if="places.length" class="rd-featured__grid">
      <li v-for="(place, index) in places" :key="place.slug" :style="{ '--rd-postcard-turn': `${[-2, 1.5, -1, 1, -1.5, 2][index % 6]}deg`, '--rd-postcard-shift': `${index % 3 === 0 ? 64 : index % 3 === 2 ? -64 : 0}px` }">
        <article class="rd-postcard">
          <span class="rd-postcard__label" aria-hidden="true">GHI CHÉP / {{ String(index + 1).padStart(2, '0') }} <span>RÀNH ĐƯỜNG ↗</span></span>
          <RdPlaceCard :place="place" :href="`/${citySlug}/dia-diem/${place.slug}`" :now="now" editorial />
          <span class="rd-postcard__signature" aria-hidden="true">Hẹn một lần ghé.</span>
        </article>
      </li>
    </ul>
    <NuxtLink v-if="places.length" class="rd-featured__all rd-featured__map" :to="`/${citySlug}/ban-do`">Xem tất cả trên bản đồ <span aria-hidden="true">→</span></NuxtLink>
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách quán, bấm Thử lại ở đầu trang nhé.</p>
    <p v-else class="empty-note">Mình chưa ghi chép quán nào ở đây. Ghé lại sau vài hôm nhé.</p>
  </section>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-3); }
.rd-featured__all { align-self: flex-start; display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
.rd-featured__heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-5); }
.rd-featured__all { gap: var(--space-4); font-size: 12px; text-underline-offset: 5px; }
.rd-featured__grid { list-style: none; margin: 0 calc(-1 * var(--editorial-gutter)); padding: var(--space-5) var(--editorial-gutter) var(--space-8); display: grid; grid-auto-flow: column; grid-auto-columns: 86%; gap: var(--space-6); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--editorial-gutter); }
.rd-featured__grid li { min-width: 0; scroll-snap-align: start; }
.rd-featured__grid li:focus-within { z-index: 2; }
.rd-postcard { height: 100%; display: flex; flex-direction: column; padding: var(--space-3); background: var(--paper-raised); background-image: var(--paper-grain); background-size: 4px 4px; box-shadow: var(--shadow-postcard); border: 1px solid var(--line); border-radius: var(--radius-postcard); transform: rotate(var(--rd-postcard-turn)); }
.rd-postcard__label { display: flex; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); font: 8px/1.6 var(--font-coordinate); color: var(--ink-soft); }
.rd-postcard :deep(.rd-place--editorial) { flex: 1; height: auto; }
.rd-postcard :deep(.rd-place__thumb) { border-radius: var(--radius-postcard); }
.rd-postcard :deep(.rd-place__quote) { font: 20px/1.3 var(--font-hand); }
.rd-postcard__signature { margin: var(--space-4) 0 var(--space-1); align-self: flex-end; color: var(--route-rust); font: 21px var(--font-hand); }
@media (min-width: 768px) { .rd-featured__grid { grid-auto-flow: initial; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-10) var(--space-6); overflow: visible; margin: 0; padding-inline: 0; } }

@media (hover: hover) and (prefers-reduced-motion: no-preference) { .rd-postcard { transition: transform var(--dur-panel) var(--ease-route); } .rd-postcard:has(a:is(:hover, :focus-visible)) { transform: translateY(-6px) rotate(0); } }
.section :deep(.rd-place__quote) { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
