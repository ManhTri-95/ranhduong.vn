<script setup lang="ts">
import type { CityNow } from '@ranhduong/contracts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RdSeasonIllustration from '~/entities/city/ui/RdSeasonIllustration.vue';
import { observeSeasonMotion } from '~/shared/lib/scroll-motion';
const props = defineProps<{ citySlug: string; current: CityNow }>();
const banner = ref<HTMLElement | null>(null);
let stopMotion = () => {};
function startMotion(): void {
  stopMotion();
  if (banner.value) stopMotion = observeSeasonMotion(banner.value);
}
onMounted(startMotion);
watch(() => props.current.season?.key, startMotion, { flush: 'post' });
onBeforeUnmount(() => stopMotion());
</script>
<template>
  <section v-if="current.season" ref="banner" class="rd-season-banner" aria-labelledby="season-banner-title">
    <div class="rd-season-banner__copy"><span class="rd-chip rd-chip--accent">Theo mùa</span><h2 id="season-banner-title">{{ current.season.title }}</h2><p>{{ current.season.sub }}</p><NuxtLink v-if="current.featuredItinerary" class="rd-season-banner__link" :to="`/${citySlug}/lich-trinh/${current.featuredItinerary.slug}`">{{ current.featuredItinerary.title }} <span aria-hidden="true">→</span></NuxtLink></div>
    <RdSeasonIllustration :illustration="current.season.illustration" />
  </section>
</template>
