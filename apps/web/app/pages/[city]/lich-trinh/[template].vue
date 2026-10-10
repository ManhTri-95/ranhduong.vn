<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useTemplateDetail } from '~/entities/itinerary/api/itineraries';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { photoOgUrl } from '~/shared/lib/media';
import { absoluteUrl } from '~/shared/lib/seo';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import { tripJsonLd } from '~/entities/itinerary/lib/itinerary-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdItineraryDetail from '~/widgets/itinerary-detail/ui/RdItineraryDetail.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.template).success,
  key: (route) => `${route.params.city}/lich-trinh/${route.params.template}`,
});
const route = useRoute();
const citySlug = String(route.params.city);
const slug = String(route.params.template);
const seoConfig = useRuntimeConfig().public;
const path = `/${citySlug}/lich-trinh/${slug}`;
const canonical = absoluteUrl(seoConfig.siteUrl, path);
const [city, template] = await Promise.all([useCity(citySlug), useTemplateDetail(citySlug, slug)]);
throwIfNotFound(city.error.value);
throwIfNotFound(template.error.value);
const failed = computed(() => Boolean(city.error.value || template.error.value));
markUnavailableOnServer(failed.value);
async function retry(): Promise<void> {
  await Promise.all([city.refresh(), template.refresh()]);
  throwIfNotFound(city.error.value);
  throwIfNotFound(template.error.value);
}
const title = computed(() => `${template.data.value?.seoTitle || template.data.value?.title || 'Lịch trình mẫu'} · Rành Đường`);
const description = computed(() => template.data.value?.seoDescription || template.data.value?.description || `Lịch trình gợi ý ở ${city.data.value?.name || 'Đà Lạt'}.`);
const mediaBase = useRuntimeConfig().public.mediaBase;
const cover = computed(() => template.data.value?.days.flatMap((day) => day.stops).find((stop) => stop.place?.coverKey)?.place?.coverKey);
usePageSeo({ path, title, description, image: () => cover.value ? photoOgUrl(mediaBase, cover.value) : undefined,
  breadcrumbs: () => [{ name: city.data.value?.name || 'Thành phố', path: `/${citySlug}` }, { name: template.data.value?.title || 'Lịch trình mẫu', path }],
  jsonLd: () => template.data.value && !failed.value ? [tripJsonLd(template.data.value, seoConfig.siteUrl, citySlug)] : [], noindex: failed,
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" />
    <main class="rd-itinerary-page">
      <nav aria-label="Đường dẫn trang"><NuxtLink class="rd-itinerary-page__back" :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink></nav>
      <RdErrorBanner v-if="failed" message="Chưa tải được lịch trình, có thể mạng đang chập chờn." @retry="retry" />
      <RdItineraryDetail v-if="template.data.value" :itinerary="template.data.value" :city="city.data.value ?? null" :city-slug="citySlug" :share-url="canonical" />
      <div v-else-if="!failed" class="rd-itinerary-page__loading" role="status" aria-label="Đang tải lịch trình" />
      <div v-else><h1 class="page-title">Lịch trình mẫu</h1><p class="empty-note">Bấm Thử lại để xem lịch trình nhé.</p></div>
    </main>
  </div>
</template>

<style scoped>
.rd-itinerary-page { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: grid; gap: var(--space-5); }
.rd-itinerary-page__back { display: inline-flex; align-items: center; min-height: var(--tap-min); text-decoration: none; font-weight: 600; }
.rd-itinerary-page__loading { min-height: 400px; background: var(--mist); border-radius: var(--radius-card); }
</style>
