<script setup lang="ts">
import { formatTripLength, type ItineraryCard } from '@ranhduong/contracts';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import { itineraryCardMeta } from '../lib/card-meta';

defineProps<{ itinerary: ItineraryCard; href: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
</script>

<template>
  <NuxtLink class="rd-itin" :to="href">
    <!-- Chưa có ảnh: đầu vé ghi số ngày (Spec UI §9), không có ô xám "Ảnh đang cập nhật". -->
    <div :class="['rd-itin__top', { 'rd-itin__top--stub': !itinerary.coverKey }]">
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
      <span class="rd-itin__days">{{ formatTripLength(itinerary.days) }}</span>
    </div>
    <div class="rd-itin__body">
      <span v-if="itinerary.season" class="rd-chip rd-chip--season">{{ itinerary.season }}</span>
      <h3 class="card__title">{{ itinerary.title }}</h3>
      <p class="rd-place__meta card__meta">{{ itineraryCardMeta(itinerary) }}</p>
      <span class="rd-itin__cta">Xem lịch <span aria-hidden="true">→</span></span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card__img { display: block; width: 100%; object-fit: cover; }
.card__title { margin: 0; font: 700 16px/22px var(--font-body); }
.card__meta { margin: 0; }
</style>
