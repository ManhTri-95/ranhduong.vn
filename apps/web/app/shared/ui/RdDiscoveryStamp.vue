<script setup lang="ts">
defineProps<{ label: string; number?: string; caption?: string }>();
</script>

<template><span class="rd-discovery-stamp"><span>{{ label }}</span><strong v-if="number">{{ number }}</strong><small v-if="caption">{{ caption }}</small></span></template>

<style scoped>
.rd-discovery-stamp { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1); width: 80px; height: 80px; max-width: 80px; flex: 0 0 auto; border: var(--border-hair) solid var(--brand-accent); border-radius: var(--radius-pill); background: var(--note); color: var(--brand-accent-text); font: 500 10px/1.4 var(--font-coordinate); text-align: center; transform: rotate(8deg); }
.rd-discovery-stamp strong { font-size: 24px; font-weight: 500; }
.rd-discovery-stamp small { font-size: 7px; max-width: 65px; }
</style>
