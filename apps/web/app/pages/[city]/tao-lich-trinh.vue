<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import RdItineraryCreate from '~/features/itinerary-create/ui/RdItineraryCreate.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdSkipLink from '~/shared/ui/RdSkipLink.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';

definePageMeta({ validate: route => Slug.safeParse(route.params.city).success, key: route => `${route.params.city}/tao-lich-trinh` });
const citySlug = String(useRoute().params.city);
const city = await useCity(citySlug);
throwIfNotFound(city.error.value);
const failed = computed(() => Boolean(city.error.value));
markUnavailableOnServer(failed.value);
const cityName = computed(() => city.data.value?.name ?? 'Đà Lạt');
async function retry(): Promise<void> { await city.refresh(); throwIfNotFound(city.error.value); }
usePageSeo({
  path: `/${citySlug}/tao-lich-trinh`, title: () => `Tạo lịch trình ${cityName.value} theo ý bạn · Rành Đường`,
  description: () => `Lên lịch đi ${cityName.value} từ 1 đến 5 ngày theo gu, người đi cùng và nhịp độ của bạn. Chọn vài nút, không cần đăng nhập.`,
  breadcrumbs: () => [{ name: cityName.value, path: `/${citySlug}` }, { name: 'Tạo lịch trình', path: `/${citySlug}/tao-lich-trinh` }], noindex: failed,
});
</script>

<template>
  <div>
    <RdSkipLink target="create-main" />
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" editorial :section-base="`/${citySlug}`" />
    <main id="create-main" class="rd-create-page" tabindex="-1">
      <nav aria-label="Đường dẫn trang"><NuxtLink :to="`/${citySlug}`">← Về {{ cityName }}</NuxtLink></nav>
      <header class="rd-create-page__intro">
        <p class="rd-create-page__eyebrow">MỘT CHUYẾN ĐI, THEO CÁCH CỦA BẠN</p>
        <h1>Tạo lịch trình <em>{{ cityName }}</em></h1>
        <p>Chọn vài điều bạn thích. Mình nối những điểm ghé thành một chuyến đi, bạn cứ thong thả lên đường.</p>
      </header>
      <RdErrorBanner v-if="failed" message="Chưa tải được thông tin thành phố. Thử lại một chút nhé." @retry="retry" />
      <RdItineraryCreate v-else-if="city.data.value" :city="city.data.value" />
    </main>
  </div>
</template>

<style scoped>
.rd-create-page { max-width: 1080px; margin: 0 auto; padding: var(--space-3) var(--space-5) var(--space-16); }
.rd-create-page > nav a { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 12px; color: var(--ink-soft); text-decoration: none; }
.rd-create-page__intro { padding: var(--space-8) 0 var(--space-6); max-width: 740px; }
.rd-create-page__eyebrow { font: 11px/1.8 var(--font-coordinate); color: var(--route-rust); }
.rd-create-page h1 { font: 700 clamp(34px, 5vw, 56px)/1.25 var(--font-display-vietnamese); margin: var(--space-4) 0; }
.rd-create-page h1 em { display: block; color: var(--brand-primary); font-style: normal; }
.rd-create-page__intro > p:last-child { color: var(--ink-soft); max-width: 580px; font-size: 15px; line-height: 1.9; }
</style>
