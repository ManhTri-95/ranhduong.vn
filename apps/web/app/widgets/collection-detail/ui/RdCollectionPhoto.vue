<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import { ref, watch } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdCompass from '~/shared/ui/RdCompass.vue';
const props = defineProps<{ place?: Pick<PlaceCard, 'name' | 'coverKey'>; priority?: boolean; sizes?: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref(false);
watch(() => props.place?.coverKey, () => { failed.value = false; });
</script>

<template>
  <div class="rd-collection-photo">
    <img v-if="place?.coverKey && !failed" :src="photoUrl(mediaBase, place.coverKey, 800)" :srcset="photoSrcset(mediaBase, place.coverKey)" :sizes="sizes ?? '(min-width: 1024px) 45vw, 100vw'" :alt="place.name" width="1200" height="900" :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" decoding="async" @error="failed = true">
    <div v-else class="rd-collection-photo__blank">
      <svg class="rd-collection-photo__contours" viewBox="0 0 600 400" fill="none" aria-hidden="true"><path v-for="n in 7" :key="n" :d="`M-80 ${100 + n * 25} C80 ${-130 + n * 38} 210 ${420 - n * 22} 330 ${150 + n * 22} S570 ${60 + n * 27} 690 ${210 + n * 25}`" stroke="currentColor" /></svg>
      <span class="rd-collection-photo__compass"><RdCompass /></span>
      <span class="rd-collection-photo__label">MỘT GÓC TRONG SỔ TAY</span>
      <span class="rd-collection-photo__caption">Ảnh đang cập nhật</span>
    </div>
  </div>
</template>

<style scoped>
.rd-collection-photo { position: relative; width: 100%; height: 100%; min-width: 0; aspect-ratio: 4 / 3; background: var(--mist); }
.rd-collection-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.rd-collection-photo__blank { position: relative; display: flex; width: 100%; height: 100%; min-height: 180px; flex-direction: column; justify-content: center; align-items: center; gap: var(--space-3); overflow: hidden; background: var(--mist); color: var(--ink); }
.rd-collection-photo__contours { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .19; }
.rd-collection-photo__compass { width: 72px; height: 72px; }
.rd-collection-photo__label { font: 500 10px/1.6 var(--font-coordinate); letter-spacing: .13em; text-align: center; }
.rd-collection-photo__caption { font: 400 20px/1.5 var(--font-hand); }
</style>
