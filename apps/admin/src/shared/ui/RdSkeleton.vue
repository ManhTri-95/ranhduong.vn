<script setup lang="ts">
defineProps<{ rows: number; variant: 'table' | 'card' }>();
</script>

<template>
  <div :class="['rd-admin-skeleton', `rd-admin-skeleton--${variant}`]" aria-busy="true">
    <span class="rd-sr-only">Đang tải…</span>
    <span v-for="index in rows" :key="index" class="rd-skeleton rd-admin-skeleton__row" aria-hidden="true"></span>
  </div>
</template>
