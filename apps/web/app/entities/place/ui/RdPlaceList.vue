<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlaceCard from './RdPlaceCard.vue';

defineProps<{ places: PlaceCard[]; citySlug: string; now: Date | null }>();
</script>

<template>
  <ul class="list">
    <li v-for="place in places" :key="place.slug">
      <RdPlaceCard :place="place" :href="`/${citySlug}/dia-diem/${place.slug}`" :now="now" />
    </li>
  </ul>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
@media (min-width: 768px) { .list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .list { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
