<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { fetchPlaceDetail, usePlaceList } from '~/entities/place/api/places';
import { mapFocusPlace, parseMapFocus } from '~/entities/place/lib/map-focus';
import { mapFilterQuery, parseMapFilters, type MapFilters } from '~/entities/place/lib/map-query';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import { useApiBase } from '~/shared/api/client';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdMapExplorer from '~/widgets/place-map/ui/RdMapExplorer.vue';
import RdSiteFooter from '~/widgets/site-footer/ui/RdSiteFooter.vue';

// fullscreen: app.vue không đặt footer dưới khung bản đồ; footer nằm cuối danh sách trong bottom sheet.
definePageMeta({ validate: (route) => Slug.safeParse(route.params.city).success, key: (route) => String(route.params.city), fullscreen: true });
const route = useRoute();
const router = useRouter();
const citySlug = String(route.params.city);
const city = await useCity(citySlug);
throwIfNotFound(city.error.value);
const apiBase = useApiBase();
const focusSlug = computed(() => parseMapFocus(route.query.place));
const focusRequested = computed(() => route.query.place !== undefined);
const focus = await useAsyncData(() => `map-focus:${citySlug}:${focusSlug.value ?? ''}`, async (_app, { signal }) => {
  const slug = focusSlug.value;
  if (!slug || !city.data.value) return { slug, place: null };
  try {
    const detail = await fetchPlaceDetail(apiBase, citySlug, slug, signal);
    return { slug, place: mapFocusPlace(detail.place, city.data.value.mapBounds) };
  } catch { return { slug, place: null }; }
});
// Nuxt may retain old data while the reactive key changes. Never apply it to another request.
const focusedPlace = computed(() => focus.data.value?.slug === focusSlug.value ? focus.data.value?.place ?? null : null);
const filters = computed(() => {
  const parsed = parseMapFilters(route.query);
  if (parsed.zone && city.data.value && !city.data.value.zones.some(zone => zone.slug === parsed.zone)) parsed.zone = undefined;
  return parsed;
});
const filterQuery = computed(() => mapFilterQuery(filters.value.category, filters.value.rainSafe, filters.value));
const places = await usePlaceList(citySlug, {
  bbox: city.data.value?.mapBounds.join(','), ...filterQuery.value, limit: 50,
}, `map-initial:${citySlug}:${new URLSearchParams(filterQuery.value).toString()}`, Boolean(city.data.value));
markUnavailableOnServer(Boolean(city.error.value || places.error.value));

async function changeFilters(value: MapFilters): Promise<void> {
  await router.replace({ path: `/${citySlug}/ban-do`, query: mapFilterQuery(value.category, value.rainSafe, value) });
}
async function retryCity(): Promise<void> {
  await city.refresh();
  throwIfNotFound(city.error.value);
}
usePageSeo({ path: `/${citySlug}/ban-do`, title: () => `Bản đồ ${city.data.value?.name ?? 'địa điểm'} · Rành Đường`, description: 'Tìm quán cà phê, chỗ ăn và chỗ chơi trong vùng bạn đang xem. Ghi chép của người rành đường.',
  breadcrumbs: () => [{ name: city.data.value?.name || 'Thành phố', path: `/${citySlug}` }, { name: 'Bản đồ', path: `/${citySlug}/ban-do` }], noindex: () => Boolean(city.error.value || places.error.value || Object.keys(filterQuery.value).length || focusRequested.value),
});
</script>

<template>
  <RdMapExplorer v-if="city.data.value" :key="citySlug" :city="city.data.value" :initial-page="places.data.value ?? null" :filters="filters" :failed="Boolean(places.error.value)" :focused-place="focusedPlace" :focus-slug="focusSlug" :focus-requested="focusRequested" :focus-pending="focus.pending.value" @filters="changeFilters" @retry-focus="focus.refresh()">
    <template #footer><RdSiteFooter /></template>
  </RdMapExplorer>
  <main v-else class="rd-map-unavailable">
    <NuxtLink :to="`/${citySlug}`">← Về trang thành phố</NuxtLink>
    <h1 class="page-title">Bản đồ địa điểm</h1>
    <RdErrorBanner message="Chưa tải được thông tin thành phố, thử lại nhé." @retry="retryCity" />
    <RdSiteFooter />
  </main>
</template>

<style scoped>
.rd-map-unavailable { padding: var(--space-5); display: grid; gap: var(--space-5); }
</style>
