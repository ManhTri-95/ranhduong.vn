<script setup lang="ts">
import type { ItineraryStopPlace } from '@ranhduong/contracts';
import RdPlacePhoto from '~/entities/place/ui/RdPlacePhoto.vue';
defineProps<{ place: ItineraryStopPlace | null; priority?: boolean; sizes?: string }>();
</script>

<template><div class="rd-journey-photo"><RdPlacePhoto :name="place?.name ?? 'Điểm dừng chưa có thông tin'" :category="place?.category" :photo-key="place?.coverKey" :priority="priority" :sizes="sizes ?? '(min-width: 1024px) 180px, 110px'" compact /></div></template>
