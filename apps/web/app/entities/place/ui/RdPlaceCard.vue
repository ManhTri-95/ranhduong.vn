<script setup lang="ts">
import { openStatus, type PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import { placeStatusText } from '../lib/open-status-text';
import { placeMeta } from '../lib/place-meta';
import RdCategoryGlyph from './RdCategoryGlyph.vue';

/** compact: thẻ gọn cho danh sách phụ (ảnh 64px, không ghi chú viết tay). */
const props = defineProps<{ place: PlaceCard; href: string; now: Date | null; compact?: boolean }>();
const mediaBase = useRuntimeConfig().public.mediaBase;

const meta = computed(() => placeMeta(props.place));
// now chỉ có sau khi chạy trên trình duyệt (useClientNow), nên HTML cache SWR không chứa trạng thái cũ.
// Quán chưa xác nhận vẫn thấy giờ, chip trung tính kèm lời nhắc (chủ dự án chốt 13/10/2026).
const status = computed(() => placeStatusText(props.now ? openStatus(props.place.openingHours, props.now) : { kind: 'unknown' }, props.place.unconfirmed));
const thumbSize = computed(() => (props.compact ? 64 : 96));
</script>

<template>
  <NuxtLink :class="['rd-place', 'card', { 'rd-place--compact': compact }]" :to="href">
    <img
      v-if="place.coverKey"
      class="rd-place__thumb card__img"
      :src="photoUrl(mediaBase, place.coverKey, 400)"
      :srcset="photoSrcset(mediaBase, place.coverKey)"
      :sizes="`${thumbSize}px`"
      alt=""
      :width="thumbSize"
      :height="thumbSize"
      loading="lazy"
      decoding="async"
    >
    <div v-else class="rd-place__thumb">
      <RdCategoryGlyph :category="place.category" />
      <span :class="compact ? 'visually-hidden' : 'card__no-photo'">Ảnh đang cập nhật</span>
    </div>
    <div class="rd-place__body">
      <h3 class="rd-place__title card__text">{{ place.name }}</h3>
      <p class="rd-place__meta card__text">{{ meta }}</p>
      <p v-if="place.note && !compact" class="rd-place__quote card__text">"{{ place.note }}"</p>
      <p class="rd-place__status card__text card__status">
        <span v-if="status.chip" :class="['rd-chip', status.accent ? 'rd-chip--accent' : 'rd-chip--outline']">{{ status.chip }}</span>
        <span v-if="status.text" class="rd-quiet">{{ status.text }}</span>
      </p>
      <p v-if="status.caveat" class="rd-quiet card__text">{{ status.caveat }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card { height: 100%; box-sizing: border-box; }
.card__img { object-fit: cover; }
.card__text { margin: 0; }
.card__no-photo { font-size: 11px; }
/* Giữ chỗ để trạng thái mở cửa hiện ra sau khi hydrate không đẩy thẻ cao lên. */
.card__status { min-height: 22px; }
</style>
