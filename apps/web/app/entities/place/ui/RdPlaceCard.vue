<script setup lang="ts">
import { openStatus, type PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import { openStatusText, type OpenStatusText } from '../lib/open-status-text';
import { placeMeta } from '../lib/place-meta';

const props = defineProps<{ place: PlaceCard; href: string; now: Date | null }>();
const mediaBase = useRuntimeConfig().public.mediaBase;

const meta = computed(() => placeMeta(props.place));
// now chỉ có sau khi chạy trên trình duyệt (useClientNow), nên HTML cache SWR không chứa trạng thái cũ.
const status = computed<OpenStatusText>(() => (props.now ? openStatusText(openStatus(props.place.openingHours, props.now)) : {}));
</script>

<template>
  <NuxtLink class="rd-place card" :to="href">
    <img
      v-if="place.coverKey"
      class="rd-place__thumb card__img"
      :src="photoUrl(mediaBase, place.coverKey, 400)"
      :srcset="photoSrcset(mediaBase, place.coverKey)"
      sizes="96px"
      alt=""
      width="96"
      height="96"
      loading="lazy"
      decoding="async"
    >
    <div v-else class="rd-place__thumb">Ảnh đang cập nhật</div>
    <div class="rd-place__body">
      <h3 class="rd-place__title card__text">{{ place.name }}</h3>
      <p class="rd-place__meta card__text">{{ meta }}</p>
      <p v-if="place.note" class="rd-place__quote card__text">"{{ place.note }}"</p>
      <p class="rd-place__status card__text card__status">
        <span v-if="place.unconfirmed" class="rd-quiet">Thông tin chưa được quán xác nhận</span>
        <template v-else>
          <span v-if="status.chip" class="rd-chip rd-chip--accent">{{ status.chip }}</span>
          <span v-if="status.text" class="rd-quiet">{{ status.text }}</span>
        </template>
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card { height: 100%; box-sizing: border-box; }
.card__img { object-fit: cover; }
.card__text { margin: 0; }
/* Giữ chỗ để trạng thái mở cửa hiện ra sau khi hydrate không đẩy thẻ cao lên. */
.card__status { min-height: 22px; }
</style>
