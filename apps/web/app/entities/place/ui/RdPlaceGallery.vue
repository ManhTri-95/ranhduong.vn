<script setup lang="ts">
import type { PlacePhoto } from '@ranhduong/contracts';
import { ref } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';

defineProps<{ photos: PlacePhoto[]; name: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref<number[]>([]);
</script>

<template>
  <section class="rd-gallery" aria-label="Ảnh địa điểm">
    <div v-if="!photos.length" class="rd-gallery__placeholder">Ảnh đang cập nhật</div>
    <div v-else class="rd-gallery__photos">
      <figure v-for="(photo, index) in photos" :key="photo.key" :class="['rd-gallery__photo', { 'rd-gallery__photo--cover': index === 0 }]">
        <img v-if="!failed.includes(index)" :src="photoUrl(mediaBase, photo.key, index === 0 ? 1200 : 400)"
          :srcset="photoSrcset(mediaBase, photo.key)" :sizes="index === 0 ? '(min-width: 1024px) 780px, 100vw' : '260px'"
          :alt="`Ảnh ${index + 1} của ${name}`" width="1200" height="800"
          :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : 'auto'"
          decoding="async" @error="failed.push(index)">
        <div v-else class="rd-gallery__placeholder">Ảnh đang cập nhật</div>
      </figure>
    </div>
    <details v-if="photos.length" class="rd-gallery__credits">
      <summary>Nguồn ảnh ({{ photos.length }})</summary>
      <ol>
        <li v-for="(photo, index) in photos" :key="photo.key">
          Ảnh {{ index + 1 }} · {{ photo.credit }} · {{ photo.license }}
          <a v-if="photo.sourceUrl" :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer">Xem nguồn ảnh {{ index + 1 }}</a>
        </li>
      </ol>
    </details>
  </section>
</template>

<style scoped>
.rd-gallery { min-width: 0; }
.rd-gallery__photos { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.rd-gallery__photo { margin: 0; width: min(260px, 100%); }
.rd-gallery__photo--cover { width: 100%; }
.rd-gallery__photo img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--radius-card); background: var(--mist); }
.rd-gallery__placeholder { display: flex; align-items: center; justify-content: center; aspect-ratio: 3 / 2; background: var(--mist); color: var(--ink-soft); border-radius: var(--radius-card); }
.rd-gallery__credits { font-size: 13px; line-height: 1.6; color: var(--ink-soft); }
.rd-gallery__credits summary { display: flex; align-items: center; min-height: var(--tap-min); cursor: pointer; text-decoration: underline; }
.rd-gallery__credits ol { padding-left: var(--space-5); margin: 0; }
.rd-gallery__credits a { display: inline-flex; align-items: center; min-height: var(--tap-min); margin-left: var(--space-2); }
</style>
