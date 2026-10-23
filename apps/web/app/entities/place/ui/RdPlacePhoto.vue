<script setup lang="ts">
import type { PlaceCategory } from '@ranhduong/contracts';
import { ref, watch } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdCategoryGlyph from './RdCategoryGlyph.vue';

const props = defineProps<{ name: string; category?: PlaceCategory; photoKey?: string; priority?: boolean; sizes?: string; decorative?: boolean; compact?: boolean }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref(false);
watch(() => props.photoKey, () => { failed.value = false; });
</script>

<template>
  <div class="rd-place-photo" :class="{ 'rd-place-photo--compact': compact }" :data-photo-state="photoKey ? failed ? 'failed' : 'image' : 'missing'">
    <img v-if="photoKey && !failed" :src="photoUrl(mediaBase, photoKey, priority ? 800 : 400)" :srcset="photoSrcset(mediaBase, photoKey)" :sizes="sizes ?? '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'" :alt="decorative ? '' : name" width="800" height="600" :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" decoding="async" @error="failed = true">
    <div v-else class="rd-place-photo__placeholder">
      <span class="rd-place-photo__glyph" aria-hidden="true"><RdCategoryGlyph v-if="category" :category="category" /><RdCompass v-else /></span>
      <span v-if="!compact" class="rd-place-photo__label">GHI CHÉP ĐỊA PHƯƠNG</span>
      <span :class="compact ? 'visually-hidden' : 'rd-place-photo__caption'">{{ failed ? 'Chưa tải được ảnh' : 'Ảnh đang cập nhật' }}</span>
    </div>
  </div>
</template>

<style scoped>
.rd-place-photo { position: relative; width: 100%; height: 100%; min-width: 0; background: var(--mist); overflow: clip; }
.rd-place-photo > img { display: block; width: 100%; height: 100%; object-fit: cover; }
.rd-place-photo__placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); width: 100%; height: 100%; padding: var(--space-3); background-image: var(--cartographic-grid); background-size: 32px 32px; color: var(--ink-soft); text-align: center; }
.rd-place-photo__glyph { display: block; flex: 0 0 auto; width: 44px; height: 44px; color: var(--ink); }
.rd-place-photo__glyph > :deep(svg) { display: block; width: 100%; height: 100%; }
.rd-place-photo__label { font: 500 10px/1.6 var(--font-coordinate); letter-spacing: .08em; }
.rd-place-photo__caption { font: 400 13px/1.5 var(--font-body); }
.rd-place-photo--compact .rd-place-photo__glyph { width: 28px; height: 28px; }
</style>
