<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import { coordinateLabel } from '~/entities/place/lib/place-story';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';

const props = defineProps<{ place: PlaceCard; citySlug: string; now: Date | null }>();
const directions = computed(() => directionHref({ status: 'active', location: props.place.location }));
const coordinates = computed(() => coordinateLabel(props.place.location));
</script>

<template>
  <div class="rd-map-postcard">
    <div class="rd-map-postcard__label"><span>ĐÃ MỞ MỘT NƠI HAY</span><span aria-hidden="true">⌖</span></div>
    <RdPlaceCard :place="place" :href="`/${citySlug}/dia-diem/${place.slug}`" :now="now" editorial />
    <p v-if="coordinates" class="rd-map-postcard__coordinates">{{ coordinates }}</p>
    <div class="rd-map-postcard__actions"><NuxtLink class="rd-btn rd-btn--primary" :to="`/${citySlug}/dia-diem/${place.slug}`">Xem địa điểm ↗</NuxtLink><a v-if="directions" class="rd-btn rd-btn--outline" :href="directions" target="_blank" rel="noopener noreferrer" data-rd-event="direction_click" :data-rd-place-id="place.id">Chỉ đường ↗</a></div>
    <div class="rd-map-postcard__journey"><button type="button" class="rd-btn rd-btn--outline" disabled aria-describedby="map-journey-availability">Thêm vào lịch trình <small>Sắp có</small></button><p id="map-journey-availability">Tính năng thêm địa điểm chưa được mở. <NuxtLink :to="`/${citySlug}#lich-trinh`">Xem lịch trình gợi ý ↗</NuxtLink></p></div>
  </div>
</template>
