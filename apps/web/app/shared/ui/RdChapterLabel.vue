<script setup lang="ts">
defineProps<{ number: string; label: string }>();
</script>

<template>
  <p class="rd-chapter"><span class="rd-chapter__number">{{ number }}</span><span>{{ label }}</span><span class="rd-chapter__line" aria-hidden="true" /></p>
</template>

<style scoped>
.rd-chapter { display: flex; align-items: center; gap: var(--space-3); margin: 0 0 var(--space-6); font: 600 10px/1.6 var(--font-body); letter-spacing: 0.1em; text-transform: uppercase; }
.rd-chapter__number { display: grid; place-items: center; flex: 0 0 32px; height: 32px; border: 1px solid currentColor; border-radius: var(--radius-pill); font: 400 11px var(--font-coordinate); letter-spacing: 0; }
.rd-chapter__line { width: var(--space-12); height: 1px; background: currentColor; opacity: 0.4; }
</style>
