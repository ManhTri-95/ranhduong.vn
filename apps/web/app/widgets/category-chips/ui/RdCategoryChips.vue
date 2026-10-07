<script setup lang="ts">
import { CATEGORY_LABEL, CATEGORY_URL_SLUG, PUBLIC_CATEGORIES } from '@ranhduong/contracts';

defineProps<{ citySlug: string }>();
</script>

<template>
  <nav aria-label="Danh mục">
    <ul class="chips">
      <li v-for="category in PUBLIC_CATEGORIES" :key="category">
        <NuxtLink class="rd-chip rd-chip--filter" :to="`/${citySlug}/${CATEGORY_URL_SLUG[category]}`">{{ CATEGORY_LABEL[category] }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.chips a { text-decoration: none; }
</style>
