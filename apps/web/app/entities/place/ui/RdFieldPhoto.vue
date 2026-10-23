<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import RdPlacePhoto from './RdPlacePhoto.vue';
defineProps<{ place: Pick<PlaceCard, 'name' | 'category' | 'coverKey'> | null; priority?: boolean; sizes?: string }>();
</script>

<template><div class="rd-field-photo"><RdPlacePhoto :name="place?.name ?? 'Ghi chép địa phương'" :category="place?.category" :photo-key="place?.coverKey" :priority="priority" :sizes="sizes" /></div></template>
