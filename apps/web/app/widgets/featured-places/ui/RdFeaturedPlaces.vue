<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';

defineProps<{ citySlug: string; places: PlaceCard[]; failed: boolean; now: Date | null }>();
</script>

<template>
  <section class="section" aria-labelledby="featured-places-title">
    <h2 id="featured-places-title" class="section-title">Chỗ dân ở đây hay ngồi</h2>
    <RdPlaceList v-if="places.length" :places="places" :city-slug="citySlug" :now="now" />
    <NuxtLink v-if="places.length" class="rd-featured__all" :to="`/${citySlug}/ban-do`">Xem tất cả trên bản đồ <span aria-hidden="true">→</span></NuxtLink>
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách quán, bấm Thử lại ở đầu trang nhé.</p>
    <p v-else class="empty-note">Mình chưa ghi chép quán nào ở đây. Ghé lại sau vài hôm nhé.</p>
  </section>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: var(--space-3); }
.rd-featured__all { align-self: flex-start; display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
/* Điện thoại hiện 4 quán; desktop đủ 6 (lưới 3 cột). Ghi chú viết tay rút còn 2 dòng. */
@media (max-width: 767.98px) { .section :deep(.list > li:nth-child(n + 5)) { display: none; } }
.section :deep(.rd-place__quote) { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
