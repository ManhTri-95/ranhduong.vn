<script setup lang="ts">
import { CATEGORY_LABEL, CATEGORY_URL_SLUG, PUBLIC_CATEGORIES } from '@ranhduong/contracts';

/**
 * chips: lối tắt vào mục (trang chủ). tabs: điều hướng giữa các mục trên trang danh mục, gạch chân mục đang xem,
 * để không trông giống chip lọc theo thẻ ngay bên dưới.
 */
withDefaults(defineProps<{ citySlug: string; variant?: 'chips' | 'tabs' }>(), { variant: 'chips' });
</script>

<template>
  <nav v-if="variant === 'tabs'" class="rd-tabs" aria-label="Danh mục">
    <ul class="rd-tabs__list">
      <li v-for="category in PUBLIC_CATEGORIES" :key="category">
        <NuxtLink class="rd-tab" :to="`/${citySlug}/${CATEGORY_URL_SLUG[category]}`">{{ CATEGORY_LABEL[category] }}</NuxtLink>
      </li>
    </ul>
  </nav>
  <nav v-else aria-label="Danh mục">
    <ul class="chips">
      <li v-for="category in PUBLIC_CATEGORIES" :key="category">
        <NuxtLink class="rd-chip rd-chip--filter" :to="`/${citySlug}/${CATEGORY_URL_SLUG[category]}`">{{ CATEGORY_LABEL[category] }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* Một hàng cuộn ngang trên điện thoại, chạm mép màn hình; desktop xuống dòng tự nhiên. */
.chips { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; gap: var(--space-2); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--space-5); scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chips li { flex: 0 0 auto; scroll-snap-align: start; }
.chips a { text-decoration: none; }
@media (min-width: 1024px) { .chips { margin: 0; padding: 0; flex-wrap: wrap; overflow: visible; } }
</style>
