<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useCuratedLists } from '~/entities/curated-list/api/curated-lists';
import { useTemplateList } from '~/entities/itinerary/api/itineraries';
import { promoteItinerary } from '~/entities/itinerary/lib/promote-itinerary';
import { usePlaceList } from '~/entities/place/api/places';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdCuratedListStrip from '~/widgets/curated-list-strip/ui/RdCuratedListStrip.vue';
import { FEATURED_QUERY } from '~/widgets/featured-places/model/query';
import RdFeaturedPlaces from '~/widgets/featured-places/ui/RdFeaturedPlaces.vue';
import RdItineraryStrip from '~/widgets/itinerary-strip/ui/RdItineraryStrip.vue';
import RdSeasonBanner from '~/widgets/season-banner/ui/RdSeasonBanner.vue';
import RdCityWeather from '~/widgets/city-weather/ui/RdCityWeather.vue';
import RdZoneLinks from '~/widgets/zone-links/ui/RdZoneLinks.vue';
import RdHomeHero from '~/widgets/home-discovery/ui/RdHomeHero.vue';
import RdHomeInterests from '~/widgets/home-discovery/ui/RdHomeInterests.vue';
import RdHomeRouteStory from '~/widgets/home-discovery/ui/RdHomeRouteStory.vue';
import RdJourneyFrame from '~/widgets/home-discovery/ui/RdJourneyFrame.vue';
import RdHomeMap from '~/widgets/home-discovery/ui/RdHomeMap.vue';
import RdHomeItineraryIntro from '~/widgets/home-discovery/ui/RdHomeItineraryIntro.vue';
import RdHomeClosing from '~/widgets/home-discovery/ui/RdHomeClosing.vue';
import '~/assets/home.css';

// Đường dẫn lạ (ví dụ /wp-login.php) bị chặn ngay, không gọi API; thành phố có hay không do API quyết định.
definePageMeta({ validate: (route) => Slug.safeParse(route.params.city).success, key: (route) => String(route.params.city) });

const citySlug = String(useRoute().params.city);
const [city, featured, templates, curated] = await Promise.all([
  useCity(citySlug),
  usePlaceList(citySlug, FEATURED_QUERY, `home-featured:${citySlug}`),
  useTemplateList(citySlug, 10),
  useCuratedLists(citySlug),
]);
throwIfNotFound(city.error.value);

const featuredFailed = computed(() => Boolean(featured.error.value));
const templatesFailed = computed(() => Boolean(templates.error.value));
const curatedFailed = computed(() => Boolean(curated.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || Boolean(city.now.error.value) || featuredFailed.value || templatesFailed.value || curatedFailed.value);
markUnavailableOnServer(loadFailed.value);

const cityName = computed(() => city.data.value?.name ?? '');
const featuredPlaces = computed(() => (featured.data.value?.items ?? []).slice(0, FEATURED_QUERY.limit));
const templateCards = computed(() => promoteItinerary(templates.data.value?.items ?? [], city.currentNow.value?.featuredItinerary ?? null));
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), city.now.refresh(), featured.refresh(), templates.refresh(), curated.refresh()]);
}

usePageSeo({
  path: `/${citySlug}`,
  title: () => (cityName.value ? `${cityName.value} hôm nay ghé đâu? · Rành Đường` : 'Rành Đường'),
  description: () =>
    `Ghi chép của người rành đường ở ${cityName.value || 'Đà Lạt'}: quán cà phê, chỗ ăn, chỗ chơi và lịch trình có sẵn. Quán nào cũng được hỏi lại trước khi lên đây.`,
  breadcrumbs: () => [{ name: cityName.value || 'Thành phố', path: `/${citySlug}` }], noindex: loadFailed,
});
</script>

<template>
  <div class="rd-home">
    <a class="rd-home-skip" href="#home-content">Đến nội dung chính</a>
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" editorial />
    <main id="home-content">
      <RdJourneyFrame>
        <div v-if="loadFailed" class="rd-home-container rd-home__error">
          <RdErrorBanner message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
        </div>
        <RdHomeHero :city-slug="citySlug" :city-name="cityName" :center="city.data.value?.center" />
        <div class="rd-home-manifesto rd-home-container">
          <p>Đi một vòng,<span>biết thêm một nơi.</span></p>
          <span class="rd-home-manifesto__note">MỘT CUỐN SỔ MỞ. NHIỀU CÁCH LÊN ĐƯỜNG.</span>
        </div>
        <div class="rd-home-container">
          <RdHomeRouteStory :city-slug="citySlug" :places="featuredPlaces" />
          <RdHomeInterests :city-slug="citySlug" />
          <div id="dia-diem" class="rd-home-section">
            <RdFeaturedPlaces :city-slug="citySlug" :places="featuredPlaces" :failed="featuredFailed" :now="now" />
          </div>
          <RdCityWeather :city-slug="citySlug" :city-name="cityName" :weather="city.currentNow.value?.weather" />
          <RdHomeMap :city-slug="citySlug" :city="city.data.value ?? null" :places="featuredPlaces" :failed="featuredFailed" />
          <div class="rd-home__zones">
            <RdZoneLinks :city-slug="citySlug" :zones="city.data.value?.zones ?? []" />
          </div>
        </div>
        <section id="lich-trinh" class="rd-home__itineraries" data-rd-route-scene aria-label="Lịch trình cho chuyến đi">
          <div class="rd-home-container">
            <RdHomeItineraryIntro :city-slug="citySlug" :itinerary="templateCards[0] ?? null" />
            <RdItineraryStrip :city-slug="citySlug" :itineraries="templateCards" :failed="templatesFailed">
              <template v-if="city.currentNow.value?.season" #lead>
                <RdSeasonBanner :city-slug="citySlug" :current="city.currentNow.value" />
              </template>
            </RdItineraryStrip>
          </div>
        </section>
        <div id="cam-hung" class="rd-home-container rd-home-section">
          <p class="rd-home-kicker">MANG THEO MỘT CHÚT CẢM HỨNG</p>
          <RdCuratedListStrip :city-slug="citySlug" :lists="curated.data.value?.items ?? []" :failed="curatedFailed" />
        </div>
        <RdHomeClosing :city-slug="citySlug" />
      </RdJourneyFrame>
    </main>
  </div>
</template>
