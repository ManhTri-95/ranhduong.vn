<script setup lang="ts">
import RdChapterLabel from './RdChapterLabel.vue';
withDefaults(defineProps<{ as?: 'h1' | 'h2' | 'h3'; id?: string; number?: string; label?: string }>(), { as: 'h2' });
</script>

<template>
  <header class="rd-editorial-heading">
    <RdChapterLabel v-if="number && label" :number="number" :label="label" />
    <p v-else-if="label" class="rd-editorial-heading__label">{{ label }}</p>
    <component :is="as" :id="id"><slot /></component>
    <div v-if="$slots.description" class="rd-editorial-heading__description"><slot name="description" /></div>
  </header>
</template>

<style scoped>
.rd-editorial-heading { display: grid; gap: var(--space-3); min-width: 0; }
.rd-editorial-heading__label { margin: 0; font: 600 var(--text-caption)/1.7 var(--font-coordinate); letter-spacing: .1em; color: var(--route-rust); text-transform: uppercase; }
.rd-editorial-heading :is(h1,h2,h3) { margin: 0; font: 700 var(--text-section)/1.25 var(--font-display); letter-spacing: -.035em; overflow-wrap: anywhere; }
.rd-editorial-heading h1 { font-size: var(--text-page); }
.rd-editorial-heading__description { color: var(--ink-soft); font: 400 var(--text-body)/1.65 var(--font-body); }
</style>
