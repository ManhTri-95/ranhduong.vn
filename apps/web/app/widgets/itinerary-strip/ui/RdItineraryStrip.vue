<script setup lang="ts">
import type { ItineraryCard } from '@ranhduong/contracts';
import RdItineraryCard from '~/entities/itinerary/ui/RdItineraryCard.vue';

defineProps<{ citySlug: string; itineraries: ItineraryCard[]; failed: boolean }>();
</script>

<template>
  <section class="section" aria-labelledby="itinerary-strip-title">
    <h2 id="itinerary-strip-title" class="section-title">Đi theo lịch có sẵn</h2>
    <ul v-if="itineraries.length" class="strip">
      <li v-for="itinerary in itineraries" :key="itinerary.slug" class="strip__item">
        <RdItineraryCard :itinerary="itinerary" :href="`/${citySlug}/lich-trinh/${itinerary.slug}`" />
      </li>
    </ul>
    <p v-else-if="failed" class="empty-note">Chưa tải được lịch trình, bấm Thử lại ở đầu trang nhé.</p>
    <p v-else class="empty-note">Mình đang soạn mấy lịch trình đầu tiên. Ghé lại sau vài hôm nhé.</p>
  </section>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-3); }
/* Cuộn ngang tràn ra sát mép màn hình, thẻ đầu vẫn thẳng lề trang. */
.strip { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; gap: var(--space-3); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--space-5); }
.strip__item { flex: 0 0 auto; scroll-snap-align: start; }
</style>
