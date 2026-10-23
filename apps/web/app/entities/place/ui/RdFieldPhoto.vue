<script setup lang="ts">
import type { PlaceCard } from '@ranhduong/contracts';
import { ref, watch } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdCategoryGlyph from './RdCategoryGlyph.vue';
const props = defineProps<{ place: Pick<PlaceCard, 'name' | 'category' | 'coverKey'> | null; priority?: boolean; sizes?: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref(false);
watch(() => props.place?.coverKey, () => { failed.value = false; });
</script>

<template>
  <div class="rd-field-photo">
    <img v-if="place?.coverKey && !failed" :src="photoUrl(mediaBase, place.coverKey, priority ? 800 : 400)" :srcset="photoSrcset(mediaBase, place.coverKey)" :sizes="sizes ?? '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'" :alt="place.name" width="800" height="600" :loading="priority ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" decoding="async" @error="failed = true">
    <div v-else class="rd-field-photo__placeholder"><span class="rd-field-photo__glyph"><RdCategoryGlyph v-if="place" :category="place.category" /><RdCompass v-else /></span><span>RÀNH ĐƯỜNG / SỔ TAY ĐỊA PHƯƠNG</span><span>{{ place ? 'Ảnh đang cập nhật' : 'Khám phá bằng một góc nhìn mới.' }}</span></div>
  </div>
</template>
