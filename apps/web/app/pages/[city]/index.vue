<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useTemplateList } from '~/entities/itinerary/api/itineraries';
import { usePlaceList } from '~/entities/place/api/places';
import RdSearchForm from '~/features/place-search/ui/RdSearchForm.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCategoryChips from '~/widgets/category-chips/ui/RdCategoryChips.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import { FEATURED_QUERY } from '~/widgets/featured-places/model/query';
import RdFeaturedPlaces from '~/widgets/featured-places/ui/RdFeaturedPlaces.vue';
import RdItineraryStrip from '~/widgets/itinerary-strip/ui/RdItineraryStrip.vue';

// Đường dẫn lạ (ví dụ /wp-login.php) bị chặn ngay, không gọi API; thành phố có hay không do API quyết định.
definePageMeta({ validate: (route) => Slug.safeParse(route.params.city).success });

const citySlug = String(useRoute().params.city);
const [city, featured, templates] = await Promise.all([
  useCity(citySlug),
  usePlaceList(citySlug, FEATURED_QUERY, `home-featured:${citySlug}`),
  useTemplateList(citySlug, 10),
]);
throwIfNotFound(city.error.value);

const featuredFailed = computed(() => Boolean(featured.error.value));
const templatesFailed = computed(() => Boolean(templates.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || featuredFailed.value || templatesFailed.value);
markUnavailableOnServer(loadFailed.value);

const cityName = computed(() => city.data.value?.name ?? '');
const featuredPlaces = computed(() => featured.data.value?.items ?? []);
const templateCards = computed(() => templates.data.value?.items ?? []);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), featured.refresh(), templates.refresh()]);
}

useSeoMeta({
  title: () => (cityName.value ? `${cityName.value} hôm nay ghé đâu? · Rành Đường` : 'Rành Đường'),
  description: () =>
    `Ghi chép của người rành đường ở ${cityName.value || 'Đà Lạt'}: quán cà phê, chỗ ăn, chỗ chơi và lịch trình có sẵn. Quán nào cũng được hỏi lại trước khi lên đây.`,
});
</script>

<template>
  <div class="home">
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" />
    <main class="home__main">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <section class="home__intro">
        <h1 class="page-title">{{ cityName ? `${cityName} hôm nay` : 'Hôm nay' }}<br>ghé đâu?</h1>
        <p class="lead">Ghi chép của người rành đường. Quán nào cũng được hỏi lại trước khi lên đây.</p>
      </section>
      <RdSearchForm :action="`/${citySlug}/tim-kiem`" :city-slug="citySlug" />
      <RdCategoryChips :city-slug="citySlug" />
      <RdItineraryStrip :city-slug="citySlug" :itineraries="templateCards" :failed="templatesFailed" />
      <RdFeaturedPlaces :city-slug="citySlug" :places="featuredPlaces" :failed="featuredFailed" :now="now" />
    </main>
    <NuxtLink class="rd-btn rd-btn--float home__map" :to="`/${citySlug}/ban-do`">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
      Xem bản đồ
    </NuxtLink>
  </div>
</template>

<style scoped>
/* Chừa chỗ cho nút nổi để thẻ cuối không bị che. */
.home { padding-bottom: calc(var(--button-height) + 2 * var(--space-6) + env(safe-area-inset-bottom, 0px)); }
.home__main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) 0; display: flex; flex-direction: column; gap: var(--space-6); }
.home__intro { display: flex; flex-direction: column; gap: var(--space-3); }
.home__map { position: fixed; left: 50%; bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 10; }
</style>
