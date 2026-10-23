<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed, watch } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceDetail } from '~/entities/place/api/places';
import { placeJsonLd } from '~/entities/place/lib/place-seo';
import { absoluteUrl } from '~/shared/lib/seo';
import { photoOgUrl, photoUrl } from '~/shared/lib/media';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdSkipLink from '~/shared/ui/RdSkipLink.vue';
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
const seoConfig = useRuntimeConfig().public;
usePageSeo({
  path: canonicalPath,
  title: () => `${detail.data.value?.place.name ?? 'Địa điểm'} · Rành Đường`,
  description: () => detail.data.value?.place.practicalNotes ?? `${detail.data.value?.place.name ?? 'Địa điểm'}: giờ mở cửa, thông tin thực tế và chỉ đường.`,
  image: () => detail.data.value?.place.photos[0] ? photoOgUrl(seoConfig.mediaBase, detail.data.value.place.photos[0].key) : undefined,
  breadcrumbs: () => [{ name: city.data.value?.name || 'Thành phố', path: `/${citySlug}` }, { name: detail.data.value?.place.name || 'Địa điểm', path: canonicalPath.value }],
  jsonLd: () => detail.data.value && !failed.value ? [placeJsonLd(detail.data.value.place, absoluteUrl(seoConfig.siteUrl, canonicalPath.value), detail.data.value.place.photos.map((photo) => photoUrl(seoConfig.mediaBase, photo.key, 1200)))] : [],
  noindex: failed,
});
</script>

<template>
  <div class="rd-place-story-page">
    <RdSkipLink target="place-story-main" label="Đến nội dung địa điểm" />
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" :section-base="`/${citySlug}`" editorial />
    <main id="place-story-main" tabindex="-1" class="rd-detail-page">
      <nav class="rd-detail-page__breadcrumbs" aria-label="Đường dẫn trang"><NuxtLink class="rd-detail-page__back" :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">{{ detail.data.value?.place.name || 'Địa điểm' }}</span></nav>
      <RdErrorBanner v-if="failed" message="Chưa tải được hết thông tin địa điểm, có thể mạng đang chập chờn." @retry="retry" />
      <RdPlaceDetail v-if="detail.data.value" :detail="detail.data.value" :city="city.data.value" :city-slug="citySlug" :now="now" />
      <section v-else class="rd-detail-page__empty"><h1 class="page-title">Thông tin địa điểm</h1><p class="empty-note">Chưa tải được ghi chép, bấm Thử lại ở trên nhé.</p></section>
    </main>
  </div>
</template>

<style scoped>
.rd-place-story-page { background-color: var(--paper); background-image: var(--paper-grain); background-size: 4px 4px; }
.rd-detail-page { max-width: var(--content-max); margin: 0 auto; padding: var(--space-2) var(--editorial-gutter) var(--space-7); display: flex; flex-direction: column; gap: var(--space-4); }
.rd-detail-page__breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); font-size: 11px; line-height: 1.8; color: var(--ink-soft); }
.rd-detail-page__breadcrumbs > span:last-child { overflow-wrap: anywhere; }
.rd-detail-page__back { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 500; text-decoration: none; }
.rd-detail-page__empty { display: flex; flex-direction: column; gap: var(--space-4); }
.rd-place-story-page__skip { position: absolute; top: var(--space-2); left: var(--space-5); transform: translateY(-180%); z-index: 50; background: var(--paper-raised); padding: var(--space-4); border-radius: var(--radius-chip); }
.rd-place-story-page__skip:focus { transform: none; }
</style>
