<script setup lang="ts">
import type { ItineraryStopPlace } from '@ranhduong/contracts';
import { ref, watch } from 'vue';
import RdCategoryGlyph from '~/entities/place/ui/RdCategoryGlyph.vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';

const props = defineProps<{ place: ItineraryStopPlace | null; priority?: boolean; sizes?: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref(false);
watch(() => props.place?.coverKey, () => { failed.value = false; });
</script>

<template>
  <div class="rd-journey-photo">
    <img v-if="place?.coverKey && !failed" :src="photoUrl(mediaBase, place.coverKey, priority ? 800 : 400)" :srcset="photoSrcset(mediaBase, place.coverKey)" :sizes="sizes ?? '(min-width: 1024px) 180px, 110px'" :alt="place.name" width="800" height="600" :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" decoding="async" @error="failed = true">
    <div v-else class="rd-journey-photo__empty">
      <RdCategoryGlyph v-if="place" :category="place.category" />
      <span v-else aria-hidden="true">↗</span>
      <span>Ảnh đang cập nhật</span>
    </div>
  </div>
</template>
