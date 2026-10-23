<script setup lang="ts">
import type { EditorialPhoto } from '~/shared/lib/editorial-photos';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdDestinationPhoto from '~/shared/ui/RdDestinationPhoto.vue';
defineProps<{ citySlug: string }>();
const interests: { label: string; detail: string; path: string; photo?: EditorialPhoto }[] = [
  { label: 'Cà phê', detail: 'Ngồi một chút, thấy khác một chút.', path: 'ca-phe', photo: 'coffee' },
  { label: 'Ăn uống', detail: 'Đi theo chiếc bụng tò mò.', path: 'an-uong' },
  { label: 'Thiên nhiên', detail: 'Tìm những góc có view đồi.', path: 'tham-quan?tags=view-doi', photo: 'lake' },
  { label: 'Check-in', detail: 'Những nơi có thẻ Sống ảo.', path: 'tham-quan?tags=song-ao', photo: 'landscape' },
  { label: 'Trải nghiệm địa phương', detail: 'Ra ngoài, thử thêm một điều.', path: 'hoat-dong', photo: 'lake' },
];
</script>

<template>
  <section id="kham-pha" class="rd-home-section rd-interests-section" data-rd-route-scene aria-labelledby="interests-title">
    <RdChapterLabel number="02" label="Chọn hướng cho hôm nay" />
    <div class="rd-home-heading"><h2 id="interests-title">Hôm nay<br>đi <em>kiểu gì?</em></h2><p>Có người đi vì một tách cà phê.<br>Có người chỉ cần một lý do để ra ngoài.</p></div>
    <ul class="rd-interests">
      <li v-for="(interest, index) in interests" :key="interest.path">
        <NuxtLink class="rd-interests__card" :class="{ 'rd-interests__card--paper': !interest.photo }" :to="`/${citySlug}/${interest.path}`">
          <div v-if="interest.photo" class="rd-interests__image"><RdDestinationPhoto :photo="interest.photo" :city-slug="citySlug" sizes="(min-width: 1024px) 20vw, 70vw" /></div>
          <svg v-else class="rd-interests__food" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M35 98h130c-5 50-30 64-65 64S40 148 35 98Zm-8 0h146M76 58c-12-13 15-15 3-31m23 31c-12-13 15-15 3-31m23 31c-12-13 15-15 3-31M70 173h60m-90-95L157 53m-103 34L174 65" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          <span class="rd-interests__number" aria-hidden="true">HƯỚNG 0{{ index + 1 }}</span>
          <div class="rd-interests__text"><h3>{{ interest.label }}</h3><p>{{ interest.detail }}</p></div>
          <span class="rd-interests__arrow" aria-hidden="true">↗</span>
        </NuxtLink>
      </li>
    </ul>
    <p class="rd-interests__annotation"><RdCompass /> Không có hướng đúng. Chỉ có hướng hợp gu.</p>
  </section>
</template>

<style scoped>
.rd-interests { list-style: none; display: grid; grid-auto-flow: column; grid-auto-columns: 74%; gap: var(--space-5); margin: 0 calc(-1 * var(--editorial-gutter)); padding: var(--space-4) var(--editorial-gutter); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--editorial-gutter); }
.rd-interests > li { min-width: 0; scroll-snap-align: start; }
.rd-interests__card { position: relative; display: flex; align-items: flex-end; min-height: 310px; height: 100%; padding: var(--space-5); isolation: isolate; color: var(--paper-raised); text-decoration: none; border-radius: var(--radius-postcard); background: var(--ink); }
.rd-interests__image { position: absolute; inset: 0; z-index: -1; overflow: hidden; border-radius: inherit; }
.rd-interests__image::after { content: ''; position: absolute; inset: 0; background: var(--editorial-shade); }
.rd-interests__number { position: absolute; top: var(--space-5); left: var(--space-5); font: 9px var(--font-coordinate); letter-spacing: 0.1em; }
.rd-interests__text { min-width: 0; }
.rd-interests h3 { margin: 0; font: 700 24px/1.3 var(--font-display); }
.rd-interests p { margin: var(--space-3) 0 0; font-size: 11px; line-height: 1.7; }
.rd-interests__arrow { position: absolute; right: var(--space-4); top: var(--space-4); font-size: 26px; }
.rd-interests__card--paper { color: var(--ink); background: var(--note); }
.rd-interests__food { position: absolute; top: var(--space-8); left: 15%; width: 70%; max-height: 190px; color: var(--route-rust); transform: rotate(-8deg); }
.rd-interests__annotation { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin: var(--space-5) 0 0; font: 21px/1.4 var(--font-hand); color: var(--ink-soft); }
.rd-interests__annotation :deep(svg) { flex: 0 0 36px; height: 36px; }
@media (min-width: 1024px) { .rd-interests { grid-auto-flow: initial; grid-template-columns: repeat(5, minmax(0, 1fr)); overflow: visible; margin: 0; padding-inline: 0; } .rd-interests > li:nth-child(even) { transform: translateY(var(--space-6)); } .rd-interests__card { min-height: 340px; } .rd-interests h3 { font-size: 22px; } .rd-interests__annotation { margin-top: var(--space-10); } }
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .rd-interests__image :deep(img), .rd-interests__arrow { transition: transform var(--dur-panel) var(--ease-route); }
  .rd-interests__card:is(:hover, :focus-visible) .rd-interests__image :deep(img) { transform: scale(1.06) translate(3px, -3px); }
  .rd-interests__card:is(:hover, :focus-visible) .rd-interests__arrow { transform: translate(3px, -3px); }
}
</style>
