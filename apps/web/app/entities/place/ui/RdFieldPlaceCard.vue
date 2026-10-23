<script setup lang="ts">
import { CATEGORY_LABEL, openStatus, type PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { placeStatusText } from '../lib/open-status-text';
import RdFieldPhoto from './RdFieldPhoto.vue';
const props = defineProps<{ place: PlaceCard; citySlug: string; now: Date | null; number: number; wide?: boolean }>();
const status = computed(() => placeStatusText(props.now ? openStatus(props.place.openingHours, props.now) : { kind: 'unknown' }, props.place.unconfirmed));
</script>

<template>
  <NuxtLink class="rd-place rd-field-card" :class="{ 'rd-field-card--wide': wide }" :to="`/${citySlug}/dia-diem/${place.slug}`">
    <div class="rd-field-card__image"><RdFieldPhoto :place="place" :sizes="wide ? '(min-width: 1024px) 65vw, (min-width: 640px) 90vw, 100vw' : undefined" /><span class="rd-field-card__stamp" aria-hidden="true">GHI CHÉP {{ String(number).padStart(2, '0') }}</span></div>
    <div class="rd-field-card__body">
      <p class="rd-field-card__category">{{ CATEGORY_LABEL[place.category] }}<span v-if="place.zoneName"> / {{ place.zoneName }}</span></p>
      <h3>{{ place.name }}</h3>
      <p v-if="place.note" class="rd-field-card__highlight">{{ place.note }}</p>
      <p class="rd-field-card__status"><span v-if="status.chip" :class="['rd-chip', status.accent ? 'rd-chip--accent' : 'rd-chip--outline']">{{ status.chip }}</span><span v-if="status.text">{{ status.text }}</span><span v-if="!status.chip && !status.text">{{ place.openingHours.length ? 'Xem giờ ghé ở trang địa điểm' : 'Giờ mở cửa đang cập nhật' }}</span></p>
      <p v-if="status.caveat" class="rd-field-card__caveat">{{ status.caveat }}</p>
      <span class="rd-field-card__action">Mở ghi chép <span aria-hidden="true">↗</span></span>
    </div>
  </NuxtLink>
</template>
