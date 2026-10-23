<script setup lang="ts">
import RdSkipLink from '~/shared/ui/RdSkipLink.vue';
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList } from '~/entities/place/api/places';
import { areaApiParams, areaIndexable, parseAreaQuery } from '~/entities/place/lib/area-guide';
import { placeListKey } from '~/entities/place/lib/listing-query';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import { itemListJsonLd } from '~/shared/lib/seo';
import { photoOgUrl } from '~/shared/lib/media';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdAreaGuide from '~/widgets/place-listing/ui/RdAreaGuide.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.zone).success,
  // Đổi thẻ hay sang trang sau thì dựng lại trang; cùng đường dẫn nên router giữ nguyên vị trí cuộn.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const zoneSlug = String(route.params.zone);
const basePath = `/${citySlug}/khu-vuc/${zoneSlug}`;
const filter = parseAreaQuery(route.query);
const params = areaApiParams(zoneSlug, filter);
const [city, list] = await Promise.all([useCity(citySlug), usePlaceList(citySlug, params, `${placeListKey(citySlug, params)}:rain=${filter.rainSafe}`)]);
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
const page = computed(() => list.data.value ?? null);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
  throwIfNotFound(city.error.value);
  throwIfNotFound(list.error.value);
  if (city.data.value && !zone.value) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });
}

const seoConfig = useRuntimeConfig().public;
const cover = computed(() => page.value?.items.find((place) => place.coverKey)?.coverKey);
usePageSeo({
  path: basePath,
  title: () => (cityName.value ? `${title.value}, ${cityName.value} · Rành Đường` : `${title.value} · Rành Đường`),
  description: () =>
    `Khám phá cà phê, chỗ ăn, chỗ chơi ở khu ${zoneName.value}${cityName.value ? `, ${cityName.value}` : ''}. Lọc theo sở thích, xem ghi chép địa điểm và tìm đường trên bản đồ.`,
  noindex: () => !areaIndexable(filter) || loadFailed.value,
  image: () => cover.value ? photoOgUrl(seoConfig.mediaBase, cover.value) : undefined,
  breadcrumbs: () => [{ name: cityName.value || 'Thành phố', path: `/${citySlug}` }, { name: title.value, path: basePath }],
  jsonLd: () => page.value && !loadFailed.value ? [itemListJsonLd(seoConfig.siteUrl, citySlug, page.value.items, title.value)] : [],
});
</script>

<template>
  <div>
    <RdSkipLink target="area-main" />
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" editorial :section-base="`/${citySlug}`" />
    <main id="area-main" tabindex="-1" class="rd-area-page">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <RdAreaGuide :city="city.data.value ?? null" :city-slug="citySlug" :zone-slug="zoneSlug" :zone-name="zoneName" :base-path="basePath" :filter="filter" :params="params" :page="page" :failed="listFailed" :now="now" />
    </main>
  </div>
</template>

<style scoped>
.rd-area-page { max-width: var(--content-max); margin: 0 auto; padding: var(--space-4) var(--space-5) var(--space-12); display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); }
</style>
