<script setup lang="ts">
import RdSkipLink from '~/shared/ui/RdSkipLink.vue';
import RdEditorialHeading from '~/shared/ui/RdEditorialHeading.vue';
import RdEmptyState from '~/shared/ui/RdEmptyState.vue';
import { CATEGORY_URL_SLUG, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList } from '~/entities/place/api/places';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import { parseSearchQuery } from '~/features/place-search/lib/search-query';
import RdSearchForm from '~/features/place-search/ui/RdSearchForm.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success,
  // Đổi từ khoá thì dựng lại trang, không giữ kết quả của từ khoá cũ.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const q = parseSearchQuery(route.query.q);
const [city, results] = await Promise.all([
  useCity(citySlug),
  usePlaceList(citySlug, { q, limit: 20 }, `search:${citySlug}:${q}`, q !== ''),
]);
throwIfNotFound(city.error.value);
throwIfNotFound(results.error.value);

const failed = computed(() => Boolean(city.error.value || results.error.value));
markUnavailableOnServer(failed.value);

const cityName = computed(() => city.data.value?.name ?? '');
const items = computed(() => results.data.value?.items ?? []);
const now = useClientNow();
const cafePath = `/${citySlug}/${CATEGORY_URL_SLUG.cafe}`;

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), ...(q ? [results.refresh()] : [])]);
}

usePageSeo({
  path: `/${citySlug}/tim-kiem`,
  title: () => (q ? `“${q}” · Rành Đường` : 'Tìm kiếm · Rành Đường'),
  description: () => `Tìm địa điểm và ghi chép thực tế ở ${cityName.value || 'thành phố'}.`,
  noindex: true,
  breadcrumbs: () => [{ name: cityName.value || 'Thành phố', path: `/${citySlug}` }, { name: 'Tìm kiếm', path: `/${citySlug}/tim-kiem` }],
});
</script>

<template>
  <div class="search-page">
    <RdSkipLink target="search-main" />
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" editorial :section-base="`/${citySlug}`" />
    <main id="search-main" tabindex="-1" class="search-page__main">
      <RdEditorialHeading as="h1" label="Mở sổ, tìm một nơi hay">Tìm{{ cityName ? ` ở ${cityName}` : '' }}</RdEditorialHeading>
      <RdSearchForm :action="`/${citySlug}/tim-kiem`" :city-slug="citySlug" :query="q" />
      <RdErrorBanner v-if="failed" message="Chưa tìm được, có thể mạng đang chập chờn." @retry="retry" />
      <template v-if="q">
        <template v-if="items.length">
          <p class="lead" role="status">{{ items.length }} chỗ khớp “{{ q }}”</p>
          <RdPlaceList :places="items" :city-slug="citySlug" :now="now" />
        </template>
        <RdEmptyState v-else-if="!failed" title="Thử rẽ hướng khác nhé?" :message="`Chưa tìm thấy ghi chép khớp “${q}”. Thử gõ ngắn hơn hoặc chọn một danh mục.`"><NuxtLink class="rd-btn rd-btn--outline" :to="cafePath">Khám phá các quán cà phê ↗</NuxtLink></RdEmptyState>
      </template>
      <p v-else-if="!failed" class="empty-note">Gõ tên quán, món ăn hay chỗ muốn đi, có dấu hay không dấu đều được.</p>
    </main>
  </div>
</template>

<style scoped>
.search-page__main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-5); overflow-wrap: anywhere; }
</style>
