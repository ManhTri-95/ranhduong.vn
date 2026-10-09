<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed, watch } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceDetail } from '~/entities/place/api/places';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdPlaceDetail from '~/widgets/place-detail/ui/RdPlaceDetail.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.place).success,
  key: (route) => route.fullPath,
});
const route = useRoute();
const citySlug = String(route.params.city);
const slug = String(route.params.place);
const [city, detail] = await Promise.all([useCity(citySlug), usePlaceDetail(citySlug, slug)]);
throwIfNotFound(city.error.value);
throwIfNotFound(detail.error.value);
const failed = computed(() => Boolean(city.error.value || detail.error.value));
markUnavailableOnServer(failed.value);
const now = useClientNow();
const canonicalPath = computed(() => `/${citySlug}/dia-diem/${detail.data.value?.place.slug ?? slug}`);
if (detail.data.value && detail.data.value.place.slug !== slug) await navigateTo(canonicalPath.value, { redirectCode: 301, replace: true });
watch(() => detail.data.value?.place.slug, async (canonical) => {
  if (canonical && canonical !== slug) await navigateTo(canonicalPath.value, { redirectCode: 301, replace: true });
});
async function retry(): Promise<void> {
  await Promise.all([city.refresh(), detail.refresh()]);
  throwIfNotFound(detail.error.value);
}
useSeoMeta({
  title: () => `${detail.data.value?.place.name ?? 'Địa điểm'} · Rành Đường`,
  description: () => detail.data.value?.place.practicalNotes ?? `${detail.data.value?.place.name ?? 'Địa điểm'}: giờ mở cửa, thông tin thực tế và chỉ đường.`,
});
useHead({ link: [{ rel: 'canonical', href: `https://ranhduong.vn${canonicalPath.value}` }] });
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" />
    <main class="rd-detail-page">
      <nav aria-label="Đường dẫn trang"><NuxtLink class="rd-detail-page__back" :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink></nav>
      <RdErrorBanner v-if="failed" message="Chưa tải được hết thông tin địa điểm, có thể mạng đang chập chờn." @retry="retry" />
      <RdPlaceDetail v-if="detail.data.value" :detail="detail.data.value" :city-slug="citySlug" :now="now" />
      <section v-else class="rd-detail-page__empty"><h1 class="page-title">Thông tin địa điểm</h1><p class="empty-note">Chưa tải được ghi chép, bấm Thử lại ở trên nhé.</p></section>
    </main>
  </div>
</template>

<style scoped>
.rd-detail-page { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-4); }
.rd-detail-page__back { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; text-decoration: none; }
.rd-detail-page__empty { display: flex; flex-direction: column; gap: var(--space-4); }
</style>
