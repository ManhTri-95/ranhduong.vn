<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { EDITORIAL_PHOTOS, type EditorialPhoto } from '~/shared/lib/editorial-photos';

const props = defineProps<{ photo: EditorialPhoto; citySlug: string; priority?: boolean; sizes?: string }>();
const source = computed(() => EDITORIAL_PHOTOS[props.photo]);
const failed = ref(false);
watch(() => props.photo, () => { failed.value = false; });
</script>

<template>
  <img
    v-if="citySlug === 'da-lat' && !failed"
    class="rd-destination-photo"
    :src="`/images/home/${source.file}-800.webp`"
    :srcset="[400, 800, 1280].map(width => `/images/home/${source.file}-${width}.webp ${width}w`).join(', ')"
    :sizes="sizes ?? '100vw'"
    :alt="source.alt"
    width="1280" :height="photo === 'lake' ? 960 : photo === 'coffee' ? 853 : 800"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    @error="failed = true"
  >
  <span v-else class="rd-destination-photo rd-destination-photo--empty" aria-hidden="true" />
</template>

<style scoped>
.rd-destination-photo { display: block; width: 100%; height: 100%; object-fit: cover; }
.rd-destination-photo--empty { background: var(--ink); }
</style>
