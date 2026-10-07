<script setup lang="ts">
import { CATEGORY_LABEL, categoryFromUrlSlug, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList, type PlaceListParams } from '~/entities/place/api/places';
import {
  isIndexableListing,
  LISTING_PAGE_SIZE,
  listingApiParams,
  parseListingQuery,
  placeListKey,
} from '~/entities/place/lib/listing-query';
import RdTagFilter from '~/features/place-tag-filter/ui/RdTagFilter.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCategoryChips from '~/widgets/category-chips/ui/RdCategoryChips.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdPlaceListing from '~/widgets/place-listing/ui/RdPlaceListing.vue';
import RdZoneLinks from '~/widgets/zone-links/ui/RdZoneLinks.vue';

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
const filter = parseListingQuery(route.query);
const params: PlaceListParams = { category, ...listingApiParams(filter), limit: LISTING_PAGE_SIZE };
const [city, list] = await Promise.all([useCity(citySlug), usePlaceList(citySlug, params, placeListKey(citySlug, params))]);
throwIfNotFound(city.error.value);
throwIfNotFound(list.error.value);

const listFailed = computed(() => Boolean(list.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || listFailed.value);
markUnavailableOnServer(loadFailed.value);

const label = CATEGORY_LABEL[category];
const cityName = computed(() => city.data.value?.name ?? '');
const title = computed(() => (cityName.value ? `${label} ở ${cityName.value}` : label));
const page = computed(() => list.data.value ?? null);
const availableTags = computed(() => page.value?.tags ?? []);
const zones = computed(() => city.data.value?.zones ?? []);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
}

useSeoMeta({
  title: () => `${title.value} · Rành Đường`,
  description: () =>
    `${title.value}: những chỗ người rành đường đã ghé, kèm giờ mở cửa, ghi chú thực tế và chỉ đường. Chỗ nào cũng được hỏi lại trước khi lên đây.`,
  // Trang lọc thẻ và trang sau không index (technical-design mục 11); bot vẫn đi theo link tới từng địa điểm.
  robots: isIndexableListing(filter) ? undefined : 'noindex, follow',
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" />
    <main class="main">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <section class="intro">
        <h1 class="page-title">{{ title }}</h1>
        <p class="lead">Ghi chép của người rành đường. Chỗ nào cũng được hỏi lại trước khi lên đây.</p>
      </section>
      <RdCategoryChips :city-slug="citySlug" />
      <RdTagFilter :action="basePath" :tags="availableTags" :selected="filter.tags" />
      <RdPlaceListing
        :city-slug="citySlug"
        :base-path="basePath"
        :params="params"
        :page="page"
        :tags="filter.tags"
        :paged="filter.cursor !== undefined"
        :failed="listFailed"
        :now="now"
      >
        <template #empty>
          <p class="empty-note">Mục này mình chưa ghi chép chỗ nào. Ghé lại sau vài hôm nhé.</p>
        </template>
      </RdPlaceListing>
      <RdZoneLinks :city-slug="citySlug" :zones="zones" />
    </main>
  </div>
</template>

<style scoped>
.main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-6); }
.intro { display: flex; flex-direction: column; gap: var(--space-3); }
</style>
