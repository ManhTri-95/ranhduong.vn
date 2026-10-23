<script setup lang="ts">
import { CATEGORY_LABEL, CATEGORY_URL_SLUG, PUBLIC_CATEGORIES, type CityPublic, type CuratedListDetail, type CuratedListSummary, type PlaceCard } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, type Component } from 'vue';
import { collectionMapPlaces } from '~/entities/curated-list/lib/collection-map';
import { fetchMapPlaces } from '~/entities/place/api/place-map';
import { shareItinerary, type ShareChannel } from '~/features/itinerary-share/lib/share';
import { useApiBase } from '~/shared/api/client';
import { observeLivingRoute } from '~/shared/lib/living-route';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdEditorialHeading from '~/shared/ui/RdEditorialHeading.vue';
import RdEmptyState from '~/shared/ui/RdEmptyState.vue';
import RdCollectionPhoto from './RdCollectionPhoto.vue';
import RdCollectionPlaceCard from './RdCollectionPlaceCard.vue';

const props = defineProps<{ citySlug: string; city: CityPublic; collection: CuratedListDetail; related: CuratedListSummary[]; shareUrl: string }>();
const apiBase = useApiBase();
const root = ref<HTMLElement>();
const now = useClientNow();
const places = computed(() => props.collection.places);
const cover = computed(() => places.value.find(place => place.coverKey));
const categories = computed(() => [...new Set(places.value.map(place => place.category))]);
const categoryLinks = computed(() => categories.value.map(category => {
  const publicCategory = PUBLIC_CATEGORIES.find(item => item === category);
  return { category, href: publicCategory ? `/${props.citySlug}/${CATEGORY_URL_SLUG[publicCategory]}` : `/${props.citySlug}/ban-do?category=${category}` };
}));
const areas = computed(() => [...new Set(places.value.flatMap(place => place.zoneName ? [place.zoneName] : []))]);
const description = computed(() => props.collection.description.trim());
const longDescription = computed(() => description.value.length > 170);
const selectedSlug = ref<string | null>(null);
const geographicPlaces = ref<PlaceCard[]>([]);
const mapPlaces = computed(() => collectionMapPlaces(places.value, geographicPlaces.value));
const mappedCount = computed(() => mapPlaces.value.filter(place => place.location).length);
const selectedPlace = computed(() => places.value.find(place => place.slug === selectedSlug.value));
const selectedLocation = computed(() => mapPlaces.value.find(place => place.slug === selectedSlug.value)?.location);
const mapOpen = ref(false);
const mapLoading = ref(false);
const mapFailed = ref(false);
const componentFailed = ref(false);
const mapComponent = shallowRef<Component | null>(null);
const mapSection = ref<HTMLElement>();
const mapHeading = ref<HTMLElement>();
const sharePanel = ref<HTMLElement>();
const shareStatus = ref('');
const manualLink = ref(false);
const sharing = ref(false);
let controller: AbortController | undefined;
let disposeMotion: (() => void) | undefined;
let disposed = false;

async function loadMap(): Promise<void> {
  if (mapLoading.value || (mapOpen.value && !mapFailed.value)) return;
  mapOpen.value = true; mapLoading.value = true; mapFailed.value = false; componentFailed.value = false;
  let importing = false;
  controller?.abort(); controller = new AbortController();
  try {
    const geographic = places.value.every(place => place.location) ? places.value : (await fetchMapPlaces(apiBase, props.citySlug, props.city.mapBounds, { rainSafe: false }, controller.signal)).places;
    if (disposed) return;
    geographicPlaces.value = geographic;
    if (mappedCount.value > 0) {
      importing = true;
      const module = await import('~/features/collection-map/ui/RdCollectionMap.client.vue');
      if (!disposed) mapComponent.value = module.default;
    }
  } catch { if (!disposed) { mapFailed.value = true; componentFailed.value = importing; } }
  finally { if (!disposed) mapLoading.value = false; }
}
function retryMap(): void { if (componentFailed.value) window.location.reload(); else void loadMap(); }
async function openMap(slug?: string): Promise<void> {
  if (slug) selectedSlug.value = slug;
  // Move keyboard focus before loading, and retain the map component for later selections.
  mapSection.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  mapHeading.value?.focus({ preventScroll: true });
  await loadMap();
}
async function share(channel: ShareChannel): Promise<void> {
  if (sharing.value) return;
  sharing.value = true; manualLink.value = false;
  try {
    const result = await shareItinerary(channel, { title: props.collection.title, url: props.shareUrl }, {
      share: typeof navigator.share === 'function' ? data => navigator.share(data) : undefined,
      copy: navigator.clipboard?.writeText ? text => navigator.clipboard.writeText(text) : undefined,
    });
    shareStatus.value = { shared: 'Đã chia sẻ bộ sưu tập.', cancelled: 'Đã hủy chia sẻ.', copied: 'Đã sao chép liên kết. Gửi cho người bạn muốn rủ đi nhé.', manual: 'Chưa sao chép được. Bạn có thể chọn và chép liên kết bên dưới.' }[result];
    manualLink.value = result === 'manual';
  } finally { sharing.value = false; }
}
function showShare(): void {
  sharePanel.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  sharePanel.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
}
onMounted(async () => { await nextTick(); if (!disposed && root.value) disposeMotion = observeLivingRoute(root.value); });
onBeforeUnmount(() => { disposed = true; controller?.abort(); disposeMotion?.(); });
</script>

<template>
  <div ref="root" class="rd-journal">
    <nav class="rd-journal__breadcrumbs" aria-label="Đường dẫn trang"><NuxtLink :to="`/${citySlug}`">{{ city.name }}</NuxtLink><span aria-hidden="true">/</span><span>Bộ sưu tập</span></nav>

    <template v-if="places.length">
    <header class="rd-journal-cover">
      <div class="rd-journal-cover__copy">
        <p class="rd-journal__eyebrow"><span class="rd-journal__tiny-route" aria-hidden="true">⤳</span> SỔ TAY RÀNH ĐƯỜNG <span class="rd-journal__eyebrow-separator">/</span> THEO CHỦ ĐỀ</p>
        <h1>{{ collection.title }}</h1>
        <p v-if="description && !longDescription" class="rd-journal-cover__description">{{ description }}</p>
        <p class="rd-curated-page__summary"><span class="rd-journal-cover__dot" aria-hidden="true" />{{ places.length }} địa điểm <span aria-hidden="true">·</span> {{ city.name }}</p>
        <div v-if="places.length" class="rd-journal-cover__tags" aria-label="Danh mục và khu vực">
          <NuxtLink v-for="item in categoryLinks" :key="item.category" :to="item.href" :prefetch="false">{{ CATEGORY_LABEL[item.category] }} <span aria-hidden="true">↗</span></NuxtLink>
          <span v-for="area in areas" :key="area" class="rd-journal-cover__area">{{ area }}</span>
        </div>
        <div class="rd-journal-cover__actions"><a v-if="places.length" class="rd-btn rd-btn--primary rd-journal__primary" href="#collection-trail">Khám phá bộ sưu tập <span aria-hidden="true">↓</span></a><button type="button" class="rd-journal__text-button" @click="showShare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7" /></svg> Chia sẻ</button></div>
      </div>
      <div class="rd-journal-cover__visual">
        <div class="rd-journal-cover__grid" aria-hidden="true" />
        <figure class="rd-journal-cover__postcard"><RdCollectionPhoto :place="cover" priority sizes="(min-width: 1024px) 43vw, 90vw" /><figcaption><span>{{ cover?.name || city.name }}</span><span class="rd-journal-cover__caption-code">GHI CHÉP ĐỊA PHƯƠNG</span></figcaption></figure>
        <div class="rd-journal-cover__stamp" aria-label="Bộ sưu tập Rành Đường"><span>RÀNH ĐƯỜNG</span><RdCompass /><span>RẼ MỘT CHÚT</span></div>
        <p class="rd-journal-cover__annotation">Những nơi cùng<br>một câu chuyện.</p>
        <svg class="rd-journal-cover__route" viewBox="0 0 250 70" fill="none" aria-hidden="true"><path d="M3 50c40 20 60-52 103-42s-14 56 34 48 53-31 100-20" pathLength="1" /><path d="m231 26 10 10-14 4" /></svg>
      </div>
    </header>

    <div class="rd-journal__index"><span><span aria-hidden="true">✳</span> NHỮNG NƠI CÙNG MỘT CÂU CHUYỆN</span><a href="#collection-map" @click.prevent="openMap()">Mở bản đồ bộ sưu tập <span aria-hidden="true">↗</span></a></div>

    <section v-if="description && longDescription" class="rd-journal-intro" aria-labelledby="collection-intro-title"><p class="rd-journal__eyebrow">LỜI MỞ ĐẦU</p><div><h2 id="collection-intro-title">Mỗi nơi, một lý do để ghé.</h2><p>{{ description }}</p></div></section>

    <section id="collection-trail" class="rd-journal-trail" aria-labelledby="collection-trail-title">
      <div class="rd-journal__section-heading"><div><p class="rd-journal__eyebrow">LẬT TỪNG TRANG, GHÉ TỪNG NƠI</p><h2 id="collection-trail-title">{{ longDescription ? 'Những điểm hẹn trong sổ tay.' : 'Mỗi nơi, một lý do để ghé.' }}</h2></div><span class="rd-journal__count">{{ String(places.length).padStart(2, '0') }} <span>ĐỊA ĐIỂM</span></span></div>
      <ol v-if="places.length" class="rd-journal-trail__places"><li v-for="(place, index) in places" :key="place.slug"><RdCollectionPlaceCard :place="place" :index="index" :city-slug="citySlug" :now="now" :selected="selectedSlug === place.slug" @focus-map="openMap" /></li></ol>
      <p v-else class="empty-note">Danh sách đang được cập nhật. Bạn ghé bản đồ để chọn chỗ đi hôm nay nhé.</p>
      <div v-if="places.length" class="rd-journal-trail__end"><span aria-hidden="true">✳</span><p>Rẽ một chút. Hay cả chuyến đi.</p><span class="rd-journal__eyebrow">RÀNH ĐƯỜNG</span></div>
    </section>

    <section id="collection-map" ref="mapSection" class="rd-journal-map" aria-labelledby="collection-map-title">
      <div class="rd-journal__section-heading"><div><p class="rd-journal__eyebrow">MỘT GÓC NHÌN KHÁC</p><h2 id="collection-map-title" ref="mapHeading" tabindex="-1">Những nơi này nằm đâu?</h2></div><span class="rd-journal-map__compass" aria-hidden="true"><RdCompass /></span></div>
      <div v-if="!mapOpen" class="rd-journal-map__entry"><div class="rd-journal-map__illustration" aria-hidden="true"><svg viewBox="0 0 600 220" fill="none"><path d="M-30 170C90 20 110 230 270 100S460 30 650 140M-20 30C150 160 210-80 370 100S540 170 640 50M100-20l70 270M430-20l-40 270" stroke="currentColor" stroke-width="1.5" /><circle cx="260" cy="108" r="15" /><path d="m255 108 4 4 7-9" /></svg><span>BẢN ĐỒ BỘ SƯU TẬP</span></div><div class="rd-journal-map__entry-copy"><p>Đặt những điểm hẹn lên bản đồ.</p><p>Xem vị trí để chọn nơi thuận tiện cho chuyến đi của bạn.</p><button v-if="places.length" type="button" class="rd-btn rd-btn--primary rd-journal__primary" @click="openMap()">Mở bản đồ <span aria-hidden="true">↗</span></button><NuxtLink v-else class="rd-btn rd-btn--outline" :to="`/${citySlug}/ban-do`" :prefetch="false">Khám phá bản đồ {{ city.name }}</NuxtLink></div></div>
      <div v-else class="rd-journal-map__opened">
        <p v-if="mapLoading" class="rd-journal-map__message" role="status">Đang tìm vị trí các địa điểm trong bộ sưu tập…</p>
        <div v-else-if="mapFailed" class="rd-journal-map__message" role="status"><p>Chưa tải được vị trí. Danh sách địa điểm vẫn ở ngay bên trên.</p><button type="button" class="rd-btn rd-btn--outline" @click="retryMap">Thử lại</button></div>
        <template v-else><component :is="mapComponent" v-if="mappedCount && mapComponent" :city="city" :places="mapPlaces" :selected-slug="selectedSlug" @select="selectedSlug = $event" /><p v-else class="rd-journal-map__message">Chưa có vị trí bản đồ cho các địa điểm trong bộ sưu tập.</p><p class="rd-journal-map__coverage">{{ mappedCount }} / {{ places.length }} địa điểm có vị trí trên bản đồ. Số ghim theo thứ tự bộ sưu tập.</p></template>
        <div v-if="selectedPlace" class="rd-journal-map__selected" aria-live="polite"><span>ĐANG CHỌN</span><strong>{{ selectedPlace.name }}</strong><span v-if="!mapLoading && !mapFailed && !selectedLocation">Chưa có vị trí cho địa điểm này.</span><NuxtLink :to="`/${citySlug}/dia-diem/${selectedPlace.slug}`">Xem chi tiết ↗</NuxtLink></div>
        <details v-if="places.length" class="rd-journal-map__list"><summary>Chọn địa điểm từ danh sách</summary><ol><li v-for="(place, index) in places" :key="place.slug"><button type="button" :aria-pressed="selectedSlug === place.slug" @click="selectedSlug = place.slug"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ place.name }}<span v-if="!mapPlaces[index]?.location"> · Chưa có vị trí</span></button></li></ol></details>
      </div>
      <p class="rd-journal-map__footnote">Vị trí để bạn tham khảo, thứ tự bộ sưu tập không phải lộ trình chỉ đường. <NuxtLink :to="`/${citySlug}/ban-do`" :prefetch="false">Khám phá bản đồ {{ city.name }} ↗</NuxtLink></p>
    </section>

    <section ref="sharePanel" class="rd-journal-share" aria-labelledby="collection-share-title"><div class="rd-journal-share__message"><p class="rd-journal__eyebrow">GỬI MỘT CHÚT CẢM HỨNG</p><h2 id="collection-share-title">Có người cũng sẽ thích những nơi này.</h2><p>Một bộ sưu tập hay, một lời rủ đi cùng.</p></div><div class="rd-journal-share__postcard"><div class="rd-journal-share__postmark" aria-hidden="true"><RdCompass /></div><span class="rd-journal__eyebrow">TỪ SỔ TAY RÀNH ĐƯỜNG</span><p class="rd-journal-share__title">{{ collection.title }}</p><p class="rd-journal-share__destination">{{ city.name }} <span aria-hidden="true">·</span> {{ places.length }} địa điểm</p><div class="rd-journal-share__actions"><button type="button" class="rd-btn rd-btn--primary rd-journal__primary" :disabled="sharing" @click="share('copy')">{{ shareStatus.startsWith('Đã sao chép') ? 'Đã sao chép ✓' : 'Sao chép liên kết' }}</button><button type="button" class="rd-journal__text-button" :disabled="sharing" @click="share('zalo')">Chia sẻ <span aria-hidden="true">↗</span></button></div><p class="rd-journal-share__status" role="status">{{ shareStatus }}</p><label v-if="manualLink" class="rd-journal-share__manual">Liên kết bộ sưu tập<input :value="shareUrl" readonly @focus="($event.target as HTMLInputElement).select()"></label></div></section>

    </template>
    <section v-else class="rd-journal-empty">
      <RdEditorialHeading as="h1" label="Sổ tay / Bộ sưu tập">{{ collection.title }}<template v-if="description" #description>{{ description }}</template></RdEditorialHeading>
      <RdEmptyState title="Một trang sổ tay đang được viết tiếp." message="Danh sách đang được cập nhật. Ghé bản đồ để chọn một nơi cho hôm nay nhé."><NuxtLink class="rd-btn rd-btn--primary" :to="`/${citySlug}/ban-do`" :prefetch="false">Khám phá bản đồ {{ city.name }} ↗</NuxtLink></RdEmptyState>
    </section>
    <section v-if="related.length" class="rd-journal-more" aria-labelledby="collection-more-title"><div class="rd-journal__section-heading"><div><p class="rd-journal__eyebrow">CHUYỆN KỂ TIẾP</p><h2 id="collection-more-title">Còn nhiều chuyện hay phía trước.</h2></div></div><ul><li v-for="item in related" :key="item.slug"><NuxtLink class="rd-journal-more__card" :to="`/${citySlug}/top/${item.slug}`"><div v-if="item.coverKey" class="rd-journal-more__photo"><RdCollectionPhoto :place="{ name: item.title, coverKey: item.coverKey }" sizes="(min-width: 768px) 30vw, 90vw" /></div><p class="rd-journal__eyebrow">{{ city.name }} / {{ item.placeCount }} ĐỊA ĐIỂM</p><h3>{{ item.title }}</h3><span class="rd-journal-more__link">Mở bộ sưu tập <span aria-hidden="true">↗</span></span></NuxtLink></li></ul></section>
  </div>
</template>

<style scoped>
.rd-journal-empty { display: grid; gap: var(--space-7); padding-block: var(--space-6) var(--space-12); }
.rd-journal { max-width: var(--content-max); margin: 0 auto; padding: 0 var(--space-5) var(--space-16); }
.rd-journal *, .rd-journal *::before, .rd-journal *::after { box-sizing: border-box; }
.rd-journal__breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); min-height: var(--tap-min); margin: var(--space-2) 0 var(--space-7); color: var(--ink-soft); font-size: 10px; }
.rd-journal__breadcrumbs a { display: inline-flex; align-items: center; min-height: var(--tap-min); text-decoration: none; }
.rd-journal__breadcrumbs > span:last-child { color: var(--ink-soft); }
.rd-journal__eyebrow { margin: 0; color: var(--ink-soft); font: 500 9px/1.8 var(--font-coordinate); letter-spacing: .12em; text-transform: uppercase; overflow-wrap: anywhere; }
.rd-journal__eyebrow-separator { color: var(--line); margin: 0 var(--space-2); }
.rd-journal__tiny-route { color: var(--route-rust); font: 400 26px/0 var(--font-body); vertical-align: middle; margin-right: var(--space-2); }
.rd-journal-cover { display: grid; gap: var(--space-10); padding-bottom: var(--space-10); }
.rd-journal-cover__copy { min-width: 0; }
.rd-journal-cover h1 { margin: var(--space-5) 0; max-width: 15ch; font: 700 clamp(38px, 5.3vw, 72px)/1.16 var(--font-display-vietnamese); letter-spacing: -.055em; overflow-wrap: anywhere; text-wrap: balance; }
.rd-journal-cover__description { margin: var(--space-5) 0; max-width: 46ch; color: var(--ink-soft); font: 400 14px/1.85 var(--font-body); white-space: pre-line; }
.rd-curated-page__summary { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-6) 0 var(--space-3); font: 500 11px/1.8 var(--font-body); }
.rd-journal-cover__dot { display: inline-block; width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--route-rust); }
.rd-journal-cover__tags { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); }
.rd-journal-cover__tags > * { display: inline-flex; align-items: center; gap: var(--space-2); max-width: 100%; font: 400 10px/1.7 var(--font-body); overflow-wrap: anywhere; }
.rd-journal-cover__tags a { min-height: var(--tap-min); text-decoration: none; padding: 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-pill); }
.rd-journal-cover__area { padding: var(--space-2) 0; color: var(--ink-soft); }
.rd-journal-cover__area::before { content: '/'; color: var(--line); margin-right: var(--space-1); }
.rd-journal-cover__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-5); margin-top: var(--space-6); }
.rd-journal .rd-journal__primary { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-5); max-width: 100%; min-height: var(--button-height); padding: var(--space-3) var(--space-5); background: var(--brand-primary); color: var(--brand-primary-foreground); border: 1px solid var(--brand-primary); border-radius: var(--radius-pill); font: 600 var(--text-utility)/1.6 var(--font-body); text-decoration: none; cursor: pointer; transition: transform var(--dur-standard) var(--ease-out), background var(--dur-standard); }
.rd-journal__text-button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: var(--tap-min); padding: var(--space-2) 0; background: transparent; border: 0; color: var(--ink); font: 600 11px/1.6 var(--font-body); cursor: pointer; }
.rd-journal__text-button svg { width: 18px; height: 18px; }
.rd-journal button:disabled {  cursor: wait;  background-color: var(--disabled-surface); color: var(--disabled-foreground); border-color: var(--disabled-border); opacity: 1;}
.rd-journal-cover__visual { position: relative; min-width: 0; padding: var(--space-6) var(--space-3) var(--space-10); }
.rd-journal-cover__grid { position: absolute; inset: var(--space-3) 0 var(--space-6) var(--space-6); background-image: var(--cartographic-grid); background-size: 26px 26px; border-radius: var(--radius-postcard); opacity: .7; }
.rd-journal-cover__postcard { position: relative; margin: 0; width: 100%; padding: var(--space-2); border: 1px solid var(--line); background: var(--paper-raised); box-shadow: var(--shadow-postcard); transform: rotate(-3deg); border-radius: var(--radius-postcard); }
.rd-journal-cover__postcard :deep(.rd-collection-photo) { aspect-ratio: 1.2; }
.rd-journal-cover__postcard figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); padding: var(--space-4) var(--space-2) var(--space-2); font: 400 16px/1.4 var(--font-hand); overflow-wrap: anywhere; }
.rd-journal-cover__caption-code { align-self: center; font: 400 7px/1.5 var(--font-coordinate); letter-spacing: .06em; }
.rd-journal-cover__stamp { position: absolute; top: 0; right: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1); width: 80px; height: 80px; border: 1px solid var(--route-rust); border-radius: var(--radius-pill); background: var(--paper); color: var(--route-rust); transform: rotate(12deg); outline: 1px dashed var(--route-rust); outline-offset: -5px; }
.rd-journal-cover__stamp > span { font: 500 6px/1.6 var(--font-coordinate); letter-spacing: .08em; }
.rd-journal-cover__stamp :deep(svg) { width: 34px; height: 34px; }
.rd-journal-cover__annotation { position: relative; z-index: 1; width: max-content; max-width: 100%; margin: var(--space-5) 0 0 auto; padding-right: var(--space-3); color: var(--route-rust); font: 400 22px/1.15 var(--font-hand); transform: rotate(-6deg); }
.rd-journal-cover__route { position: absolute; bottom: 8px; left: 0; width: 55%; height: 60px; color: var(--route-rust); }
.rd-journal-cover__route path { stroke: currentColor; stroke-width: 1.3; }
.rd-journal__index { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-6); padding: var(--space-3) 0; border-top: 1px solid var(--ink); border-bottom: var(--border); font: 500 9px/1.8 var(--font-coordinate); letter-spacing: .04em; }
.rd-journal__index > span { display: flex; align-items: center; gap: var(--space-3); }
.rd-journal__index > span > span { color: var(--route-rust); font-size: 22px; }
.rd-journal__index a { display: inline-flex; min-height: var(--tap-min); align-items: center; gap: var(--space-3); text-decoration: none; }
.rd-journal h2 { margin: var(--space-3) 0 0; font: 700 clamp(26px, 3vw, 38px)/1.35 var(--font-display-vietnamese); letter-spacing: -.035em; overflow-wrap: anywhere; text-wrap: balance; }
.rd-journal-intro { display: grid; gap: var(--space-5); padding-top: var(--space-10); }
.rd-journal-intro > div { min-width: 0; }
.rd-journal-intro h2 { font-size: 26px; }
.rd-journal-intro div > p { max-width: 65ch; margin: var(--space-5) 0 0; font: 400 15px/1.9 var(--font-body); color: var(--ink-soft); white-space: pre-line; overflow-wrap: anywhere; }
.rd-journal__section-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); margin-bottom: var(--space-7); }
.rd-journal__section-heading > div { min-width: 0; }
.rd-journal__count { flex: 0 0 auto; font: 700 32px/1 var(--font-display-vietnamese); color: var(--route-rust); text-align: right; }
.rd-journal__count > span { display: block; margin-top: var(--space-2); color: var(--ink-soft); font: 500 7px/1.8 var(--font-coordinate); letter-spacing: .08em; }
.rd-journal-trail { padding-top: var(--space-12); scroll-margin-top: var(--space-6); }
.rd-journal-trail__places { list-style: none; margin: 0; padding: 0; }
.rd-journal-trail__places > li { min-width: 0; }
.rd-journal-trail__places > li:last-child :deep(.rd-journal-place__marker svg) { height: calc(100% - 32px); }
.rd-journal-trail__end { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); margin-top: var(--space-3); text-align: center; }
.rd-journal-trail__end > span:first-child { color: var(--route-rust); font-size: 28px; }
.rd-journal-trail__end p { margin: 0; font: 400 25px/1.4 var(--font-hand); }
.rd-journal-map { padding-top: var(--space-16); scroll-margin-top: var(--space-6); }
.rd-journal-map__compass { width: 48px; height: 48px; flex: 0 0 48px; color: var(--ink-soft); }
.rd-journal-map__entry { display: grid; background: var(--mist); border: 1px solid var(--line); border-radius: var(--radius-postcard); }
.rd-journal-map__illustration { position: relative; min-width: 0; height: 160px; background-image: var(--cartographic-grid); background-size: 30px 30px; color: var(--ink-soft); }
.rd-journal-map__illustration svg { width: 100%; height: 100%; opacity: .4; }
.rd-journal-map__illustration > span { position: absolute; bottom: var(--space-3); left: var(--space-4); font: 500 8px var(--font-coordinate); letter-spacing: .1em; }
.rd-journal-map__entry-copy { padding: var(--space-6); border-top: 1px solid var(--line); }
.rd-journal-map__entry-copy p:first-child { margin: 0; font: 700 23px/1.35 var(--font-display-vietnamese); }
.rd-journal-map__entry-copy p:nth-child(2) { margin: var(--space-3) 0 var(--space-5); color: var(--ink-soft); font: 400 12px/1.8 var(--font-body); }
.rd-journal-map__footnote { margin: var(--space-3) 0 0; color: var(--ink-soft); font: 400 10px/1.8 var(--font-body); }
.rd-journal-map__footnote a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-journal-map__opened { min-width: 0; border: var(--border); background: var(--paper-raised); }
.rd-journal-map__message { padding: var(--space-6); font: 400 14px/1.8 var(--font-body); }
.rd-journal-map__coverage { margin: 0; padding: var(--space-3) var(--space-4); font: 400 10px/1.8 var(--font-body); color: var(--ink-soft); }
.rd-journal-map__selected { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-4); background: var(--selected-surface); overflow-wrap: anywhere;  color: var(--selected-foreground);}
.rd-journal-map__selected > span { font: 500 8px/1.8 var(--font-coordinate); }
.rd-journal-map__selected strong { font: 700 18px/1.5 var(--font-display-vietnamese); }
.rd-journal-map__selected a { display: inline-flex; min-height: var(--tap-min); align-items: center; font-size: 11px; }
.rd-journal-map__list { border-top: var(--border); font: 400 12px/1.7 var(--font-body); }
.rd-journal-map__list summary { min-height: var(--tap-min); padding: var(--space-4); cursor: pointer; }
.rd-journal-map__list ol { list-style: none; padding: 0 var(--space-4) var(--space-4); margin: 0; max-height: 300px; overflow-y: auto; }
.rd-journal-map__list button { display: block; min-height: var(--tap-min); width: 100%; padding: var(--space-3); text-align: left; border: 0; border-bottom: var(--border); background: transparent; color: var(--ink); font: inherit; cursor: pointer; overflow-wrap: anywhere; }
.rd-journal-map__list button > span:first-child { margin-right: var(--space-3); font-family: var(--font-coordinate); }
.rd-journal-map__list button[aria-pressed='true'] { background: var(--selected-surface);  color: var(--selected-foreground);}
.rd-journal-share { display: grid; gap: var(--space-7); margin-top: var(--space-16); padding: var(--space-7) var(--space-5); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background-image: var(--paper-grain); background-size: 4px 4px; }
.rd-journal-share__message > p:last-child { margin: var(--space-4) 0 0; color: var(--ink-soft); font: 400 12px/1.8 var(--font-body); }
.rd-journal-share__postcard { position: relative; min-width: 0; padding: var(--space-6); border: 1px solid var(--line); background: var(--paper-raised); box-shadow: var(--shadow-postcard); border-radius: var(--radius-postcard); overflow-wrap: anywhere; }
.rd-journal-share__postmark { float: right; width: 42px; height: 42px; margin: 0 0 var(--space-2) var(--space-2); color: var(--route-rust); }
.rd-journal-share__title { margin: var(--space-5) 0 var(--space-3); font: 700 24px/1.4 var(--font-display-vietnamese); letter-spacing: -.03em; }
.rd-journal-share__destination { margin: 0; font: 400 10px/1.8 var(--font-body); color: var(--ink-soft); }
.rd-journal-share__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-5); margin-top: var(--space-5); }
.rd-journal-share__status { margin: var(--space-3) 0 0; font: 400 var(--text-utility)/1.8 var(--font-body); }
.rd-journal-share__status:empty { display: none; }
.rd-journal-share__manual { display: block; margin-top: var(--space-4); font-size: 11px; }
.rd-journal-share__manual input { display: block; width: 100%; min-width: 0; min-height: var(--tap-min); margin-top: var(--space-2); padding: var(--space-2); border: var(--border); background: var(--paper); color: var(--ink); font: 400 16px var(--font-body); }
.rd-journal-more { padding-top: var(--space-16); }
.rd-journal-more ul { list-style: none; display: grid; gap: var(--space-5); margin: 0; padding: 0; }
.rd-journal-more li { min-width: 0; }
.rd-journal-more__card { display: flex; height: 100%; flex-direction: column; min-width: 0; padding: var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-postcard); color: var(--ink); text-decoration: none; background: var(--paper-raised); transition: transform var(--dur-standard) var(--ease-out); }
.rd-journal-more__photo { margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-5)) var(--space-5); }
.rd-journal-more__photo :deep(.rd-collection-photo) { aspect-ratio: 16 / 9; height: auto; }
.rd-journal-more h3 { margin: var(--space-4) 0 var(--space-5); font: 700 23px/1.4 var(--font-display-vietnamese); letter-spacing: -.03em; overflow-wrap: anywhere; }
.rd-journal-more__link { display: flex; justify-content: space-between; gap: var(--space-4); margin-top: auto; padding-top: var(--space-4); border-top: var(--border); font: 600 10px/1.8 var(--font-body); }
@media (min-width: 768px) { .rd-journal { padding-inline: var(--space-10); } .rd-journal__breadcrumbs { margin-bottom: var(--space-10); } .rd-journal-cover { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; gap: var(--space-7); } .rd-journal-cover h1 { font-size: clamp(38px, 5vw, 72px); } .rd-journal-cover__visual { padding-bottom: var(--space-16); } .rd-journal-cover__annotation { font-size: 24px; } .rd-journal__section-heading { margin-bottom: var(--space-10); } .rd-journal-trail { padding-top: var(--space-16); } .rd-journal__count { font-size: 42px; } .rd-journal-map__entry { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .rd-journal-map__illustration { height: 100%; min-height: 260px; } .rd-journal-map__entry-copy { padding: var(--space-10); border-top: 0; border-left: var(--border); } .rd-journal-share { grid-template-columns: minmax(0, .9fr) minmax(0, 1fr); align-items: center; padding: var(--space-10); gap: var(--space-10); } .rd-journal-more ul { grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); } .rd-journal-intro { grid-template-columns: minmax(0, 1fr) minmax(0, 3fr); padding-block: var(--space-12) 0; } }
@media (min-width: 1024px) { .rd-journal { padding-inline: var(--space-10); } .rd-journal-cover { gap: var(--space-16); padding-bottom: var(--space-12); } .rd-journal-cover__postcard :deep(.rd-collection-photo) { aspect-ratio: 1.1; } .rd-journal-cover__stamp { width: 96px; height: 96px; right: -6px; } .rd-journal-cover__stamp :deep(svg) { width: 42px; height: 42px; } .rd-journal-cover__stamp > span { font-size: 7px; } .rd-journal-cover__description { font-size: 15px; } .rd-journal-trail { padding-top: var(--space-20); } .rd-journal-map, .rd-journal-more { padding-top: var(--space-20); } .rd-journal-share { margin-top: var(--space-20); } }
@media (max-width: 359px) { .rd-journal { padding-inline: var(--space-4); } .rd-journal-cover h1 { font-size: 35px; } .rd-journal__eyebrow { font-size: 8px; } .rd-journal-share { padding-inline: var(--space-4); } .rd-journal-share__postcard { padding: var(--space-4); } }
@media (hover: hover) and (prefers-reduced-motion: no-preference) { .rd-journal .rd-journal__primary:hover { transform: translateY(-2px); } .rd-journal-more__card:hover { transform: translateY(-4px); } }
@media (prefers-reduced-motion: no-preference) { .rd-journal-cover__copy > * { animation: rd-journal-title var(--dur-route) var(--ease-route) both; } .rd-journal-cover__copy > :nth-child(n+3) { animation-delay: 80ms; } .rd-journal-cover__postcard { animation: rd-journal-photo 700ms var(--ease-route) both; } .rd-journal-cover__stamp { animation: rd-journal-stamp 700ms var(--ease-route) both; } .rd-journal-cover__route path:first-child { stroke-dasharray: 1; animation: rd-journal-route 750ms var(--ease-route) both; } .rd-journal[data-rd-route-motion='live'] :deep(.rd-journal-place__photo) { opacity: calc(.65 + var(--rd-route-progress, 1) * .35); } }
@keyframes rd-journal-title { from { opacity: .3; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes rd-journal-photo { from { opacity: .3; clip-path: inset(0 0 12% 0); transform: translateY(12px) rotate(-1deg); } to { opacity: 1; clip-path: inset(0); transform: rotate(-3deg); } }
@keyframes rd-journal-stamp { from { opacity: 0; transform: scale(.92) rotate(0); } to { opacity: 1; transform: scale(1) rotate(12deg); } }
@keyframes rd-journal-route { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
</style>
