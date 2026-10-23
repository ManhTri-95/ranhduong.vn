<script setup lang="ts">
import { useId } from 'vue';
import RdCompass from './RdCompass.vue';
defineProps<{ title: string; message?: string }>();
const titleId = useId();
</script>

<template>
  <section class="rd-empty-state" :aria-labelledby="titleId">
    <span class="rd-empty-state__compass" aria-hidden="true"><RdCompass /></span>
    <h2 :id="titleId">{{ title }}</h2><p v-if="message">{{ message }}</p>
    <div v-if="$slots.default" class="rd-empty-state__actions"><slot /></div>
  </section>
</template>

<style scoped>
.rd-empty-state { display: grid; justify-items: start; gap: var(--space-4); min-width: 0; padding: var(--space-6); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-postcard); }
.rd-empty-state__compass { width: 44px; height: 44px; color: var(--route-rust); }
.rd-empty-state h2 { margin: 0; font: 700 clamp(24px, 3vw, 32px)/1.3 var(--font-display); overflow-wrap: anywhere; }
.rd-empty-state p { margin: 0; max-width: 55ch; color: var(--ink-soft); font: 400 var(--text-body)/1.65 var(--font-body); overflow-wrap: anywhere; }
.rd-empty-state__actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.rd-empty-state__actions :deep(a) { display: inline-flex; align-items: center; min-height: var(--tap-min); }
</style>
