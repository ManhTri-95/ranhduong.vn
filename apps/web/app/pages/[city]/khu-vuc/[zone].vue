<script setup lang="ts">
import { PUBLIC_CATEGORIES, Slug } from '@ranhduong/contracts';
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
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdPlaceListing from '~/widgets/place-listing/ui/RdPlaceListing.vue';
import RdZoneLinks from '~/widgets/zone-links/ui/RdZoneLinks.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.zone).success,
  // Đổi thẻ hay sang trang sau thì dựng lại trang; cùng đường dẫn nên router giữ nguyên vị trí cuộn.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const zoneSlug = String(route.params.zone);
const basePath = `/${citySlug}/khu-vuc/${zoneSlug}`;
const filter = parseListingQuery(route.query);
// Mọi danh mục có trang công khai (không có lưu trú, mua sắm).
const params: PlaceListParams = {
  category: PUBLIC_CATEGORIES.join(','),
  zone: zoneSlug,
  ...listingApiParams(filter),
  limit: LISTING_PAGE_SIZE,
};
const [city, list] = await Promise.all([useCity(citySlug), usePlaceList(citySlug, params, placeListKey(citySlug, params))]);
throwIfNotFound(city.error.value);
// API trả 404 khi cụm không có trong thành phố.
throwIfNotFound(list.error.value);

const zones = computed(() => city.data.value?.zones ?? []);
const zone = computed(() => zones.value.find((z) => z.slug === zoneSlug));
// Danh sách lỗi (không phải 404) nhưng đã có thông tin thành phố: cụm không có thì vẫn là 404, không phải 503.
if (city.data.value && !zone.value) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });

const listFailed = computed(() => Boolean(list.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || listFailed.value);
markUnavailableOnServer(loadFailed.value);

const cityName = computed(() => city.data.value?.name ?? '');
const zoneName = computed(() => zone.value?.name ?? '');
const title = computed(() => (zoneName.value ? `Khu ${zoneName.value}` : 'Khu vực'));
/** Gợi ý khi khu này chưa có chỗ nào: cụm đầu tiên khác cụm đang xem (thứ tự seed, Trung tâm trước). */
const otherZone = computed(() => zones.value.find((z) => z.slug !== zoneSlug));
const page = computed(() => list.data.value ?? null);
const availableTags = computed(() => page.value?.tags ?? []);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
}

useSeoMeta({
  title: () => (cityName.value ? `${title.value}, ${cityName.value} · Rành Đường` : `${title.value} · Rành Đường`),
  description: () =>
    `Cà phê, chỗ ăn, chỗ chơi ở khu ${zoneName.value}${cityName.value ? `, ${cityName.value}` : ''}: ghi chép của người rành đường, chỗ nào cũng được hỏi lại trước khi lên đây.`,
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
        <p class="lead">Ghi chép của người rành đường{{ cityName ? ` ở ${cityName}` : '' }}. Chỗ nào cũng được hỏi lại trước khi lên đây.</p>
      </section>
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
          <p class="empty-note">
            Khu này mình chưa ghi chép chỗ nào.<template v-if="otherZone">
              Xem <NuxtLink :to="`/${citySlug}/khu-vuc/${otherZone.slug}`">khu {{ otherZone.name }}</NuxtLink> nhé?
            </template>
          </p>
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
