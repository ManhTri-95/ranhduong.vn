<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';

defineProps<{ citySlug: string; places: PlaceCard[]; failed: boolean; now: Date | null }>();
</script>

<template>
  <section class="section" aria-labelledby="featured-places-title">
    <h2 id="featured-places-title" class="section-title">Chỗ dân ở đây hay ngồi</h2>
    <RdPlaceList v-if="places.length" :places="places" :city-slug="citySlug" :now="now" />
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách quán, bấm Thử lại ở đầu trang nhé.</p>
    <p v-else class="empty-note">Mình chưa ghi chép quán nào ở đây. Ghé lại sau vài hôm nhé.</p>
  </section>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-3); }
</style>
