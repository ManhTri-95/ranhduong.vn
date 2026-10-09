<script setup lang="ts">
import { CATEGORY_URL_SLUG, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList } from '~/entities/place/api/places';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import { parseSearchQuery } from '~/features/place-search/lib/search-query';
import RdSearchForm from '~/features/place-search/ui/RdSearchForm.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
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

useSeoMeta({
  title: () => (q ? `“${q}” · Rành Đường` : 'Tìm kiếm · Rành Đường'),
  robots: 'noindex, follow',
});
</script>

<template>
  <div class="search-page">
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" />
    <main class="search-page__main">
      <h1 class="page-title">Tìm{{ cityName ? ` ở ${cityName}` : '' }}</h1>
      <RdSearchForm :action="`/${citySlug}/tim-kiem`" :query="q" />
      <RdErrorBanner v-if="failed" message="Chưa tìm được, có thể mạng đang chập chờn." @retry="retry" />
      <template v-if="q">
        <template v-if="items.length">
          <p class="lead" role="status">{{ items.length }} chỗ khớp “{{ q }}”</p>
          <RdPlaceList :places="items" :city-slug="citySlug" :now="now" />
        </template>
        <p v-else-if="!failed" class="empty-note" role="status">
          Mình chưa ghi chép chỗ nào khớp “{{ q }}”. Thử gõ ngắn hơn, hoặc xem <NuxtLink :to="cafePath">các quán cà phê</NuxtLink>.
        </p>
      </template>
      <p v-else-if="!failed" class="empty-note">Gõ tên quán, món ăn hay chỗ muốn đi, có dấu hay không dấu đều được.</p>
    </main>
  </div>
</template>

<style scoped>
.search-page__main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-5); overflow-wrap: anywhere; }
</style>
