<script setup lang="ts">
import { CATEGORY_LABEL, categoryFromUrlSlug, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList } from '~/entities/place/api/places';
import { categoryApiParams, parseCategoryQuery } from '~/entities/place/lib/category-guide';
import { discoveryIndexable } from '~/entities/place/lib/discovery-query';
import { placeListKey } from '~/entities/place/lib/listing-query';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import { itemListJsonLd } from '~/shared/lib/seo';
import { photoOgUrl } from '~/shared/lib/media';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdCategoryGuide from '~/widgets/place-listing/ui/RdCategoryGuide.vue';

definePageMeta({
  // Chỉ 4 danh mục công khai (CATEGORY_URL_SLUG); slug khác (luu-tru, cafe, khu-vuc, dia-diem…) là 404, không gọi API.
  // Trang tĩnh cùng cấp (tim-kiem.vue, ban-do.vue…) được Vue Router ưu tiên hơn route động này.
  validate: (route) =>
    Slug.safeParse(route.params.city).success && categoryFromUrlSlug(String(route.params.category)) !== undefined,
  // Đổi thẻ hay sang trang sau thì dựng lại trang; cùng đường dẫn nên router giữ nguyên vị trí cuộn.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const categorySlug = String(route.params.category);
const category = categoryFromUrlSlug(categorySlug);
if (!category) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });

const basePath = `/${citySlug}/${categorySlug}`;
const categoryQuery = { ...route.query };
// Validate optional area filters against real city membership before requesting places.
const city = await useCity(citySlug);
throwIfNotFound(city.error.value);
const filter = computed(() => parseCategoryQuery(categoryQuery, city.data.value?.zones.map(zone => zone.slug) ?? []));
const params = computed(() => categoryApiParams(category, filter.value));
const list = await usePlaceList(citySlug, params, computed(() => `${placeListKey(citySlug, params.value)}:rain=${filter.value.rainSafe}`));
throwIfNotFound(list.error.value);

const listFailed = computed(() => Boolean(list.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || listFailed.value);
markUnavailableOnServer(loadFailed.value);

const label = CATEGORY_LABEL[category];
const cityName = computed(() => city.data.value?.name ?? '');
const title = computed(() => (cityName.value ? `${label} ở ${cityName.value}` : label));
const page = computed(() => list.data.value ?? null);
const now = useClientNow();

async function retry(): Promise<void> {
  await city.refresh();
  throwIfNotFound(city.error.value);
  await list.refresh();
  throwIfNotFound(list.error.value);
}

const seoConfig = useRuntimeConfig().public;
const cover = computed(() => page.value?.items.find((place) => place.coverKey)?.coverKey);
usePageSeo({
  path: basePath,
  title: () => `${title.value} · Rành Đường`,
  description: () =>
    `${title.value}: tìm địa điểm hợp gu, lọc theo sở thích và khu vực, xem ghi chép thực tế rồi mở bản đồ để chọn nơi muốn ghé.`,
  // Trang lọc thẻ và trang sau không index (technical-design mục 11); bot vẫn đi theo link tới từng địa điểm.
  noindex: () => !discoveryIndexable(filter.value) || loadFailed.value,
  image: () => cover.value ? photoOgUrl(seoConfig.mediaBase, cover.value) : undefined,
  breadcrumbs: () => [{ name: cityName.value || 'Thành phố', path: `/${citySlug}` }, { name: label, path: basePath }],
  jsonLd: () => page.value && !loadFailed.value ? [itemListJsonLd(seoConfig.siteUrl, citySlug, page.value.items, title.value)] : [],
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" editorial :section-base="`/${citySlug}`" />
    <main class="rd-category-page">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <RdCategoryGuide :city="city.data.value ?? null" :city-slug="citySlug" :category="category" :base-path="basePath" :filter="filter" :params="params" :page="page" :failed="listFailed" :pending="list.pending.value" :now="now" />
    </main>
  </div>
</template>

<style scoped>
.rd-category-page { max-width: var(--content-max); margin: 0 auto; padding: var(--space-4) var(--space-5) var(--space-12); display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
</style>
