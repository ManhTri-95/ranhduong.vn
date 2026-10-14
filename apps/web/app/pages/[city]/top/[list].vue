<script setup lang="ts">
import { Slug } from '@ranhduong/contracts';
import { computed, ref } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { useCuratedList, useCuratedLists } from '~/entities/curated-list/api/curated-lists';
import { curatedListSummary } from '~/entities/curated-list/lib/list-summary';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { shareItinerary } from '~/features/itinerary-share/lib/share';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { photoOgUrl } from '~/shared/lib/media';
import { absoluteUrl, itemListJsonLd } from '~/shared/lib/seo';
import { useClientNow } from '~/shared/lib/use-client-now';
import { usePageSeo } from '~/shared/lib/use-page-seo';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.list).success,
  key: (route) => route.fullPath,
});
const route = useRoute();
const citySlug = String(route.params.city);
const slug = String(route.params.list);
const [city, list, lists] = await Promise.all([useCity(citySlug), useCuratedList(citySlug, slug), useCuratedLists(citySlug)]);
throwIfNotFound(city.error.value);
throwIfNotFound(list.error.value);
// Danh sách "Chủ đề khác" lỗi thì chỉ ẩn mục đó, không làm cả trang 503.
const failed = computed(() => Boolean(city.error.value || list.error.value));
markUnavailableOnServer(failed.value);
const now = useClientNow();
async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh(), lists.refresh()]);
  throwIfNotFound(city.error.value);
  throwIfNotFound(list.error.value);
}
const seoConfig = useRuntimeConfig().public;
const path = `/${citySlug}/top/${slug}`;
const places = computed(() => list.data.value?.places ?? []);
const summary = computed(() => curatedListSummary(places.value));
const otherLists = computed(() => (lists.data.value?.items ?? []).filter((item) => item.slug !== slug && item.placeCount > 0));
const cover = computed(() => places.value.find((place) => place.coverKey)?.coverKey);

// Chia sẻ: bảng chia sẻ của máy (Zalo, Messenger…), không có thì copy link.
const shareStatus = ref('');
const sharing = ref(false);
async function share(): Promise<void> {
  if (sharing.value || !list.data.value) return;
  sharing.value = true;
  const result = await shareItinerary('zalo', { title: list.data.value.title, url: absoluteUrl(seoConfig.siteUrl, path) }, {
    share: typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined,
    copy: navigator.clipboard?.writeText ? (text) => navigator.clipboard.writeText(text) : undefined,
  });
  sharing.value = false;
  shareStatus.value = { shared: '', cancelled: '', copied: 'Đã copy link danh sách.', manual: `Chép link này để gửi nhé: ${absoluteUrl(seoConfig.siteUrl, path)}` }[result];
}

usePageSeo({
  path,
  title: () => `${list.data.value?.title ?? 'Danh sách gợi ý'} · Rành Đường`,
  description: () => list.data.value?.description || `${list.data.value?.title ?? 'Danh sách gợi ý'}: các địa điểm được chọn ở ${city.data.value?.name ?? 'Đà Lạt'}.`,
  image: () => cover.value ? photoOgUrl(seoConfig.mediaBase, cover.value) : undefined,
  breadcrumbs: () => [{ name: city.data.value?.name || 'Thành phố', path: `/${citySlug}` }, { name: list.data.value?.title || 'Danh sách gợi ý', path }],
  jsonLd: () => list.data.value && !failed.value ? [itemListJsonLd(seoConfig.siteUrl, citySlug, list.data.value.places, list.data.value.title)] : [], noindex: failed,
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="city.data.value?.name ?? ''" />
    <main class="rd-curated-page">
      <nav aria-label="Đường dẫn trang"><NuxtLink class="rd-curated-page__back" :to="`/${citySlug}`">← {{ city.data.value?.name || 'Về trang thành phố' }}</NuxtLink></nav>
      <RdErrorBanner v-if="failed" message="Chưa tải được danh sách gợi ý, có thể mạng đang chập chờn." @retry="retry" />
      <div class="rd-curated-page__layout">
        <header class="rd-curated-page__intro">
          <p class="rd-curated-page__eyebrow">Gợi ý theo chủ đề</p>
          <h1 class="page-title">{{ list.data.value?.title ?? 'Danh sách gợi ý' }}</h1>
          <p v-if="summary" class="rd-curated-page__summary">{{ summary }}</p>
          <p v-if="list.data.value?.description" class="rd-curated-page__description">{{ list.data.value.description }}</p>
          <div v-if="list.data.value" class="rd-curated-page__actions">
            <button type="button" class="rd-btn rd-btn--outline" :disabled="sharing" @click="share">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
              Chia sẻ
            </button>
            <NuxtLink class="rd-btn rd-btn--outline" :to="`/${citySlug}/ban-do`">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
              Mở bản đồ
            </NuxtLink>
          </div>
          <p class="rd-curated-page__status" role="status" aria-live="polite">{{ shareStatus }}</p>
        </header>

        <section class="rd-curated-page__list" aria-labelledby="curated-places-title">
          <h2 id="curated-places-title" class="visually-hidden">Địa điểm theo thứ tự gợi ý</h2>
          <ol v-if="places.length" class="rd-curated-page__places">
            <li v-for="(place, index) in places" :key="place.slug" class="rd-curated-page__place">
              <span class="rd-curated-page__rank" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
              <RdPlaceCard :place="place" :href="`/${citySlug}/dia-diem/${place.slug}`" :now="now" />
            </li>
          </ol>
          <p v-else-if="list.data.value" class="empty-note">Danh sách đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi hôm nay nhé.</p>
        </section>
      </div>

      <section v-if="otherLists.length" class="rd-curated-page__more" aria-labelledby="curated-more-title">
        <h2 id="curated-more-title" class="section-title">Chủ đề khác</h2>
        <ul class="rd-curated-page__more-list">
          <li v-for="item in otherLists" :key="item.slug">
            <NuxtLink class="rd-curated-page__more-card" :to="`/${citySlug}/top/${item.slug}`">
              <span class="rd-curated-page__more-count">{{ item.placeCount }} địa điểm</span>
              <span class="rd-curated-page__more-title">{{ item.title }}</span>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.rd-curated-page { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-5); }
.rd-curated-page__back { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; text-decoration: none; }
.rd-curated-page__layout { display: grid; gap: var(--space-6); }
.rd-curated-page__intro { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; overflow-wrap: anywhere; }
.rd-curated-page__intro p { margin: 0; }
.rd-curated-page__eyebrow { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-soft); }
.rd-curated-page__summary { font-weight: 600; }
.rd-curated-page__description { max-width: 65ch; white-space: pre-line; font-size: 16px; line-height: 1.7; }
.rd-curated-page__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-curated-page__actions .rd-btn { font: 600 14px var(--font-body); }
.rd-curated-page__actions button.rd-btn { cursor: pointer; }
.rd-curated-page__status { min-height: 1.5em; font-size: 14px; color: var(--ink-soft); }
.rd-curated-page__status:empty { min-height: 0; }
/* Điện thoại: số thứ tự là vòng tròn đè lên góc ảnh (như mốc lịch trình), thẻ giữ đủ chiều rộng. */
.rd-curated-page__places { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.rd-curated-page__place { position: relative; min-width: 0; }
.rd-curated-page__rank { position: absolute; z-index: 1; top: var(--space-1); left: var(--space-1); display: grid; place-items: center; width: 30px; height: 30px; box-sizing: border-box; border: var(--border-strong) solid var(--paper-raised); border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); font: 700 13px/1 var(--font-body); pointer-events: none; }
/* Từ 768px: danh sách xếp hạng kiểu sổ tay, số Lora lớn ở cột trái gắn liền với thẻ. */
@media (min-width: 768px) {
  .rd-curated-page__places { gap: var(--space-4); }
  .rd-curated-page__place { display: grid; grid-template-columns: var(--space-7) minmax(0, 1fr); gap: var(--space-3); align-items: start; }
  .rd-curated-page__rank { position: static; display: block; width: auto; height: auto; padding-top: var(--space-2); border: 0; border-top: var(--border-strong) solid var(--accent); border-radius: 0; background: transparent; color: var(--ink); font: 700 22px/1 var(--font-display); }
}
.rd-curated-page__more { display: flex; flex-direction: column; gap: var(--space-3); padding-top: var(--space-5); border-top: var(--border); }
.rd-curated-page__more-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
.rd-curated-page__more-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); min-height: var(--button-height); padding: var(--space-2) var(--space-4); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); color: var(--ink); text-decoration: none; transition: border-color var(--dur-standard) var(--ease-out); }
.rd-curated-page__more-count { font-size: 12px; font-weight: 600; color: var(--ink-soft); }
.rd-curated-page__more-title { font: 700 17px/1.3 var(--font-display); overflow-wrap: anywhere; }
@media (hover: hover) { .rd-curated-page__more-card:hover { border-color: var(--ink-soft); } }
@media (min-width: 768px) { .rd-curated-page__more-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
/* Desktop: phần giới thiệu dính bên trái, danh sách một cột bên phải để thứ tự đọc liền mạch. */
@media (min-width: 1024px) {
  .rd-curated-page__layout { grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: var(--space-7) calc(var(--space-7) * 2); align-items: start; }
  .rd-curated-page__intro { position: sticky; top: var(--space-6); }
}
</style>
