<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlacePhoto from '~/entities/place/ui/RdPlacePhoto.vue';
defineProps<{ place?: Pick<PlaceCard, 'name' | 'coverKey'> & Partial<Pick<PlaceCard, 'category'>>; priority?: boolean; sizes?: string }>();
</script>

<template><div class="rd-collection-photo"><RdPlacePhoto :name="place?.name ?? 'Ghi chép địa phương'" :category="place?.category" :photo-key="place?.coverKey" :priority="priority" :sizes="sizes ?? '(min-width: 1024px) 45vw, 100vw'" /></div></template>

<style scoped>
.rd-collection-photo { width: 100%; height: 100%; min-width: 0; aspect-ratio: 4 / 3; }
</style>
