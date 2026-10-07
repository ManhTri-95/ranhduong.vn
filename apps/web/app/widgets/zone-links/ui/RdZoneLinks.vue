<script setup lang="ts">
// Link tới các trang khu vực; NuxtLink tự gắn aria-current="page" cho cụm đang xem (tô như chip đang chọn).
defineProps<{ citySlug: string; zones: { slug: string; name: string }[] }>();
</script>

<template>
  <nav v-if="zones.length" class="zones" aria-labelledby="zone-links-title">
    <h2 id="zone-links-title" class="section-title">Theo khu vực</h2>
    <ul class="zones__list">
      <li v-for="zone in zones" :key="zone.slug">
        <NuxtLink class="rd-chip rd-chip--filter" :to="`/${citySlug}/khu-vuc/${zone.slug}`">{{ zone.name }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.zones { display: flex; flex-direction: column; gap: var(--space-3); }
.zones__list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.zones__list a { text-decoration: none; }
</style>
