<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useCuratedList } from '~/entities/curated-list/api/curated-lists';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.list).success,
  key: (route) => route.fullPath,
});
const route = useRoute();
const citySlug = String(route.params.city);
const slug = String(route.params.list);
const [city, list] = await Promise.all([useCity(citySlug), useCuratedList(citySlug, slug)]);
throwIfNotFound(city.error.value);
throwIfNotFound(list.error.value);
const failed = computed(() => Boolean(city.error.value || list.error.value));
markUnavailableOnServer(failed.value);
const now = useClientNow();
async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
  throwIfNotFound(city.error.value);
  throwIfNotFound(list.error.value);
}
useSeoMeta({
  title: () => `${list.data.value?.title ?? 'Danh sách gợi ý'} · Rành Đường`,
  description: () => list.data.value?.description || `${list.data.value?.title ?? 'Danh sách gợi ý'}: các địa điểm được chọn ở ${city.data.value?.name ?? 'Đà Lạt'}.`,
});
useHead({ link: [{ rel: 'canonical', href: `https://ranhduong.vn/${citySlug}/top/${slug}` }] });
</script>
<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" />
    <main class="rd-curated-page">
      <nav aria-label="Đường dẫn trang"><NuxtLink class="rd-curated-page__back" :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink></nav>
      <RdErrorBanner v-if="failed" message="Chưa tải được danh sách gợi ý, có thể mạng đang chập chờn." @retry="retry" />
      <header class="rd-curated-page__intro">
        <p class="rd-curated-page__eyebrow">Gợi ý theo chủ đề</p>
        <h1 class="page-title">{{ list.data.value?.title ?? 'Danh sách gợi ý' }}</h1>
        <p v-if="list.data.value?.description" class="rd-curated-page__description">{{ list.data.value.description }}</p>
        <p v-if="list.data.value?.places.length" class="rd-curated-page__count">{{ list.data.value.places.length }} địa điểm để ghé</p>
      </header>
      <ol v-if="list.data.value?.places.length" class="rd-curated-page__places" aria-label="Địa điểm theo thứ tự gợi ý">
        <li v-for="(place, index) in list.data.value.places" :key="place.slug" class="rd-curated-page__place">
          <span class="rd-curated-page__number" aria-hidden="true">{{ index + 1 }}</span>
          <RdPlaceCard :place="place" :href="`/${citySlug}/dia-diem/${place.slug}`" :now="now" />
        </li>
      </ol>
      <p v-else-if="list.data.value" class="empty-note">Danh sách đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi hôm nay nhé.</p>
      <NuxtLink v-if="list.data.value" class="rd-btn rd-btn--outline rd-curated-page__map" :to="`/${citySlug}/ban-do`">Xem bản đồ</NuxtLink>
    </main>
  </div>
</template>
<style scoped>
.rd-curated-page { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-5); }
.rd-curated-page__back { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; text-decoration: none; }
.rd-curated-page__intro { display: flex; flex-direction: column; gap: var(--space-3); overflow-wrap: anywhere; }
.rd-curated-page__eyebrow, .rd-curated-page__count { margin: 0; font-weight: 600; color: var(--ink-soft); }
.rd-curated-page__description { margin: 0; max-width: 720px; white-space: pre-line; line-height: 1.7; }
.rd-curated-page__places { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-4); }
.rd-curated-page__place { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.rd-curated-page__number { display: grid; place-items: center; width: var(--tap-min); height: var(--tap-min); background: var(--accent); color: var(--ink); border: var(--border); border-radius: var(--radius-pill); font: 700 22px/1 var(--font-hand); }
.rd-curated-page__map { align-self: flex-start; }
@media (min-width: 768px) { .rd-curated-page__places { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
