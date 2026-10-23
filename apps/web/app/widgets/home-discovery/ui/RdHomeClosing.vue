<script setup lang="ts">
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdDestinationPhoto from '~/shared/ui/RdDestinationPhoto.vue';
defineProps<{ citySlug: string }>();
</script>

<template>
  <section class="rd-home-closing" data-rd-route-scene aria-labelledby="closing-title">
    <div class="rd-home-closing__image"><RdDestinationPhoto photo="landscape" :city-slug="citySlug" /></div>
    <div class="rd-home-closing__content rd-home-container">
      <RdChapterLabel number="07" label="Cuốn sổ vẫn còn trang" />
      <h2 id="closing-title">Đường còn dài.<br><em>Cứ đi rồi sẽ biết.</em></h2>
      <p>Một nơi hay. Một ngã rẽ khác.<br>Đôi khi, vậy là đủ cho một chuyến đi đáng nhớ.</p>
      <NuxtLink class="rd-btn rd-home-closing__cta" :to="`/${citySlug}/ban-do`">Đi khám phá thôi <span aria-hidden="true">↗</span></NuxtLink>
      <div class="rd-home-closing__signature"><RdCompass /><span>Đi một vòng,<br>biết thêm một nơi.</span></div>
      <svg class="rd-home-closing__route" viewBox="0 0 900 180" fill="none" aria-hidden="true"><path pathLength="1000" d="M0 110C180-100 200 270 460 80S760-20 880 140" /><circle cx="880" cy="140" r="7" /></svg>
    </div>
  </section>
</template>

<style scoped>
.rd-home-closing { position: relative; isolation: isolate; overflow: hidden; background: var(--ink); color: var(--paper-raised); }
.rd-home-closing__image { position: absolute; inset: 0; z-index: -1; }
.rd-home-closing__image::after { content: ''; position: absolute; inset: 0; background: var(--editorial-overlay); }
.rd-home-closing__content { position: relative; padding-block: var(--space-16); }
.rd-home-closing h2 { position: relative; z-index: 1; margin: var(--space-8) 0 var(--space-6); font-size: clamp(36px, 5.5vw, 76px); }
.rd-home-closing h2 em { color: var(--route-highlight); }
.rd-home-closing__content > p { font-size: 13px; line-height: 1.9; }
.rd-home-closing__cta { position: relative; z-index: 1; margin-top: var(--space-6); background: var(--route-highlight); color: var(--ink); border-radius: var(--radius-postcard); font-size: 14px; }
.rd-home-closing__cta > span { margin-left: var(--space-6); font-size: 24px; }
.rd-home-closing__signature { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-12); }
.rd-home-closing__signature :deep(svg) { width: 58px; height: 58px; }
.rd-home-closing__signature > span { font: 23px/1.2 var(--font-hand); transform: rotate(-5deg); }
.rd-home-closing__route { position: absolute; width: 90%; height: 160px; bottom: var(--space-6); right: -10%; color: var(--route-highlight); opacity: 0.6; pointer-events: none; }
.rd-home-closing__route path { stroke: currentColor; stroke-width: 1.5; stroke-dasharray: 1000; stroke-dashoffset: calc(1000 * (1 - var(--rd-route-progress, 1))); }
.rd-home-closing__route circle { fill: currentColor; }
.rd-home-closing :focus-visible { outline-color: var(--route-highlight); }
@media (min-width: 1024px) { .rd-home-closing__content { padding-block: var(--space-24); } .rd-home-closing__signature { position: absolute; right: var(--editorial-gutter); bottom: 155px; } }
</style>
