<script setup lang="ts">
import RdSkipLink from '~/shared/ui/RdSkipLink.vue';
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useCuratedList, useCuratedLists } from '~/entities/curated-list/api/curated-lists';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { photoOgUrl } from '~/shared/lib/media';
import { absoluteUrl, itemListJsonLd } from '~/shared/lib/seo';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdCollectionJournal from '~/widgets/collection-detail/ui/RdCollectionJournal.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.list).success,
  key: (route) => route.fullPath,
});
const route = useRoute();
const citySlug = String(route.params.city);
const slug = String(route.params.list);
const [city, list, lists] = await Promise.all([useCity(citySlug), useCuratedList(citySlug, slug), useCuratedLists(citySlug)]);
throwIfNotFound(city.error.value);
throwIfNotFound(list.error.value);
// Related collections are optional; their failure must not fail the collection page.
const failed = computed(() => Boolean(city.error.value || list.error.value));
markUnavailableOnServer(failed.value);
async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh(), lists.refresh()]);
  throwIfNotFound(city.error.value);
  throwIfNotFound(list.error.value);
}
const seoConfig = useRuntimeConfig().public;
const path = `/${citySlug}/top/${slug}`;
const otherLists = computed(() => (lists.data.value?.items ?? []).filter((item) => item.slug !== slug && item.placeCount > 0));
const cover = computed(() => list.data.value?.places.find((place) => place.coverKey)?.coverKey);

usePageSeo({
  path,
  title: () => `${list.data.value?.title ?? 'Danh sách gợi ý'} · Rành Đường`,
  description: () => list.data.value?.description || `${list.data.value?.title ?? 'Danh sách gợi ý'}: các địa điểm được chọn ở ${city.data.value?.name ?? 'Đà Lạt'}.`,
  image: () => cover.value ? photoOgUrl(seoConfig.mediaBase, cover.value) : undefined,
  breadcrumbs: () => [{ name: city.data.value?.name || 'Thành phố', path: `/${citySlug}` }, { name: list.data.value?.title || 'Danh sách gợi ý', path }],
  jsonLd: () => list.data.value && !failed.value ? [itemListJsonLd(seoConfig.siteUrl, citySlug, list.data.value.places, list.data.value.title)] : [], noindex: failed,
});
</script>

<template>
  <div>
    <RdSkipLink target="collection-main" />
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" editorial defer-map :section-base="`/${citySlug}`" />
    <main id="collection-main" tabindex="-1" class="rd-curated-page">
      <div v-if="failed" class="rd-curated-page__error"><RdErrorBanner message="Chưa tải được danh sách gợi ý, có thể mạng đang chập chờn." @retry="retry" /><NuxtLink :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink></div>
      <RdCollectionJournal v-if="city.data.value && list.data.value" :city-slug="citySlug" :city="city.data.value" :collection="list.data.value" :related="otherLists" :share-url="absoluteUrl(seoConfig.siteUrl, path)" />
    </main>
  </div>
</template>

<style scoped>
.rd-curated-page { background-image: var(--paper-grain); background-size: 4px 4px; }
.rd-curated-page__error { max-width: var(--content-max); margin: 0 auto; padding: var(--space-5); }
.rd-curated-page__error > a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
</style>
