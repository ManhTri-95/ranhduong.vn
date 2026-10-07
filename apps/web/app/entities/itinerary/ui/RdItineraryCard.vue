<script setup lang="ts">
import { itineraryMeta, type ItineraryCard } from '@ranhduong/contracts';
import { photoSrcset, photoUrl } from '~/shared/lib/media';

defineProps<{ itinerary: ItineraryCard; href: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
</script>

<template>
  <NuxtLink class="rd-itin" :to="href">
    <img
      v-if="itinerary.coverKey"
      class="rd-itin__img card__img"
      :src="photoUrl(mediaBase, itinerary.coverKey, 400)"
      :srcset="photoSrcset(mediaBase, itinerary.coverKey)"
      sizes="250px"
      alt=""
      width="250"
      height="120"
      loading="lazy"
      decoding="async"
    >
    <div v-else class="rd-itin__img">Ảnh đang cập nhật</div>
    <div class="rd-itin__body">
      <h3 class="card__title">{{ itinerary.title }}</h3>
      <p class="rd-place__meta card__meta">{{ itineraryMeta(itinerary) }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card__img { display: block; width: 100%; object-fit: cover; }
.card__title { margin: 0; font: 700 16px/22px var(--font-body); }
.card__meta { margin: 0; }
</style>
