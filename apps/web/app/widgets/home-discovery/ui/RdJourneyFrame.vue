<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { observeLivingRoute } from '~/shared/lib/living-route';

const root = ref<HTMLElement>();
let dispose: (() => void) | undefined;
onMounted(() => { if (root.value) dispose = observeLivingRoute(root.value); });
onBeforeUnmount(() => dispose?.());
</script>

<template>
  <div ref="root" class="rd-journey">
    <svg class="rd-journey__thread" viewBox="0 0 50 1000" preserveAspectRatio="none" aria-hidden="true">
      <path class="rd-journey__thread-base" d="M25 0C-5 100 55 150 25 240S-5 400 25 490 55 660 25 730-5 900 25 1000" />
      <path class="rd-journey__thread-ink" pathLength="1000" d="M25 0C-5 100 55 150 25 240S-5 400 25 490 55 660 25 730-5 900 25 1000" />
    </svg>
    <slot />
  </div>
</template>

<style scoped>
.rd-journey { position: relative; --rd-route-progress: 1; }
.rd-journey__thread { display: none; position: absolute; top: 0; bottom: 0; left: var(--space-3); width: var(--space-8); height: 100%; z-index: 3; pointer-events: none; fill: none; stroke: var(--route-rust); }
.rd-journey__thread-base { stroke-width: 0.8; opacity: 0.12; }
.rd-journey__thread-ink { stroke-width: 1; opacity: 0.5; stroke-dasharray: 1000; stroke-dashoffset: calc(1000 * (1 - var(--rd-route-progress))); }
@media (min-width: 1280px) { .rd-journey__thread { display: block; } }
</style>
