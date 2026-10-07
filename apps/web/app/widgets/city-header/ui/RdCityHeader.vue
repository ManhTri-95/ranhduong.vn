<script setup lang="ts">
// Lát 1 chỉ có Đà Lạt: hiện tên thành phố, chưa có nút chọn thành phố.
defineProps<{ citySlug: string; cityName: string }>();
</script>

<template>
  <header class="header">
    <NuxtLink class="header__logo" :to="`/${citySlug}`">Rành Đường</NuxtLink>
    <span v-if="cityName" class="header__city"><span class="header__dot" aria-hidden="true" />{{ cityName }}</span>
  </header>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5); }
.header__logo { display: inline-flex; align-items: center; min-height: var(--tap-min); font: 700 24px/1 var(--font-display); letter-spacing: -0.3px; color: var(--ink); text-decoration: none; }
.header__city { display: inline-flex; align-items: center; gap: var(--space-2); height: var(--tap-min); padding: 0 var(--space-4); border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--paper-raised); font: 600 14px/1 var(--font-body); }
.header__dot { width: 10px; height: 10px; border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--accent); }
</style>
