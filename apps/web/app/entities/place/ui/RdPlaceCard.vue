<script setup lang="ts">
import { CATEGORY_LABEL, openStatus, type PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { placeStatusText } from '../lib/open-status-text';
import { placeMeta } from '../lib/place-meta';
import RdPlacePhoto from './RdPlacePhoto.vue';

/** compact: thẻ gọn cho danh sách phụ (ảnh 64px, không ghi chú viết tay). */
const props = defineProps<{ place: PlaceCard; href: string; now: Date | null; compact?: boolean; editorial?: boolean }>();

const meta = computed(() => placeMeta(props.place));
// now chỉ có sau khi chạy trên trình duyệt (useClientNow), nên HTML cache SWR không chứa trạng thái cũ.
// Quán chưa xác nhận vẫn thấy giờ, chip trung tính kèm lời nhắc (chủ dự án chốt 13/10/2026).
const status = computed(() => placeStatusText(props.now ? openStatus(props.place.openingHours, props.now) : { kind: 'unknown' }, props.place.unconfirmed));
const thumbSize = computed(() => (props.compact ? 64 : 96));
</script>

<template>
  <NuxtLink :class="['rd-place', 'card', { 'rd-place--compact': compact, 'rd-place--editorial': editorial }]" :to="href">
    <RdPlacePhoto class="rd-place__thumb" :name="place.name" :category="place.category" :photo-key="place.coverKey" :sizes="editorial ? '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw' : `${thumbSize}px`" :compact="!editorial" decorative />
    <div class="rd-place__body">
      <p v-if="editorial" class="rd-place__eyebrow">{{ CATEGORY_LABEL[place.category] }} <span aria-hidden="true">↗</span></p>
      <h3 class="rd-place__title card__text">{{ place.name }}</h3>
      <p class="rd-place__meta card__text">{{ meta }}</p>
      <p v-if="place.note && !compact" class="rd-place__quote card__text">"{{ place.note }}"</p>
      <p class="rd-place__status card__text card__status">
        <span v-if="status.chip" :class="['rd-chip', status.accent ? 'rd-chip--success' : 'rd-chip--outline']">{{ status.chip }}</span>
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
.rd-place--editorial { display: flex; flex-direction: column; gap: var(--space-4); padding: 0; background: transparent; border: 0; border-radius: 0; }
.rd-place--editorial .rd-place__thumb { display: flex; width: 100%; height: auto; aspect-ratio: 4 / 3; flex-basis: auto; border-radius: var(--radius-card); object-fit: cover; }
.rd-place--editorial .rd-place__body { gap: var(--space-2); }
.rd-place__eyebrow { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 600; color: var(--ink-soft); }
.rd-place__eyebrow > span { font-size: 22px; }
.rd-place--editorial .rd-place__title { font: 700 19px/1.5 var(--font-display); }
.rd-place--editorial .rd-place__quote { font: 400 12px/1.8 var(--font-body); color: var(--ink-soft); }
.rd-place--editorial .rd-place__meta { font-size: 11px; }
@media (hover: hover) and (prefers-reduced-motion: no-preference) { .rd-place--editorial { transition: transform var(--dur-standard) var(--ease-out); } .rd-place--editorial:hover { transform: translateY(-4px); } }
.rd-place--editorial .rd-place__thumb[data-photo-state='missing'] { aspect-ratio: 2.3; }
.rd-place--editorial .rd-place__meta, .rd-place__eyebrow { font-size: var(--text-utility); }
</style>
