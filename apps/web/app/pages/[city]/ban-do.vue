<script setup lang="ts">
import { PlaceCategory, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList } from '~/entities/place/api/places';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdMapExplorer from '~/widgets/place-map/ui/RdMapExplorer.vue';

definePageMeta({ validate: (route) => Slug.safeParse(route.params.city).success, key: (route) => String(route.params.city) });
const route = useRoute();
const router = useRouter();
const citySlug = String(route.params.city);
const category = computed(() => {
  const parsed = PlaceCategory.safeParse(route.query.category);
  return parsed.success ? parsed.data : undefined;
});
const city = await useCity(citySlug);
throwIfNotFound(city.error.value);
const places = await usePlaceList(citySlug, {
  bbox: city.data.value?.mapBounds.join(','), category: category.value, limit: 50,
}, `map-initial:${citySlug}:${category.value ?? 'all'}`, Boolean(city.data.value));
markUnavailableOnServer(Boolean(city.error.value || places.error.value));

async function changeCategory(value: PlaceCategory | undefined): Promise<void> {
  await router.replace({ path: `/${citySlug}/ban-do`, query: value ? { category: value } : {} });
}
async function retryCity(): Promise<void> {
  await city.refresh();
  throwIfNotFound(city.error.value);
}
useSeoMeta({ title: () => `Bản đồ ${city.data.value?.name ?? 'địa điểm'} · Rành Đường`, description: 'Tìm quán cà phê, chỗ ăn và chỗ chơi trong vùng bạn đang xem. Ghi chép của người rành đường.' });
useHead({ link: [{ rel: 'canonical', href: `https://ranhduong.vn/${citySlug}/ban-do` }] });
</script>

<template>
  <RdMapExplorer v-if="city.data.value" :key="citySlug" :city="city.data.value" :initial-page="places.data.value ?? null" :category="category" :failed="Boolean(places.error.value)" @category="changeCategory" />
  <main v-else class="rd-map-unavailable">
    <NuxtLink :to="`/${citySlug}`">← Về trang thành phố</NuxtLink>
    <h1 class="page-title">Bản đồ địa điểm</h1>
    <RdErrorBanner message="Chưa tải được thông tin thành phố, thử lại nhé." @retry="retryCity" />
  </main>
</template>

<style scoped>
.rd-map-unavailable { padding: var(--space-5); display: grid; gap: var(--space-5); }
</style>
