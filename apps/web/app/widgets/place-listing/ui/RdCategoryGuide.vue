<script setup lang="ts">
import { CATEGORY_LABEL, PUBLIC_CATEGORIES, type CityPublic, type PlaceListResponse, type PublicCategory } from '@ranhduong/contracts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PlaceListParams } from '~/entities/place/api/places';
import { CATEGORY_IDENTITY, categoryAreaHref, categoryMapHref, categoryMoments, categorySiblingHref } from '~/entities/place/lib/category-guide';
import { discoveryHref, type DiscoveryFilter } from '~/entities/place/lib/discovery-query';
import RdCategoryGlyph from '~/entities/place/ui/RdCategoryGlyph.vue';
import RdDiscoveryFilter from '~/features/place-tag-filter/ui/RdDiscoveryFilter.vue';
import { observeLivingRoute } from '~/shared/lib/living-route';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdCategoryCover from './RdCategoryCover.vue';
import RdCategoryNavigator from './RdCategoryNavigator.vue';
import RdPlaceListing from './RdPlaceListing.vue';

const props = defineProps<{ city: CityPublic | null; citySlug: string; category: PublicCategory; basePath: string; filter: DiscoveryFilter; params: PlaceListParams; page: PlaceListResponse | null; failed: boolean; pending?: boolean; now: Date | null }>();
const root = ref<HTMLElement | null>(null);
const visiblePlaces = ref(props.page?.items ?? []);
const identity = computed(() => CATEGORY_IDENTITY[props.category]);
const cover = computed(() => props.page?.items.find(place => place.coverKey) ?? null);
const moods = computed(() => categoryMoments(props.page?.tags ?? []));
const alternatives = computed(() => PUBLIC_CATEGORIES.filter(category => category !== props.category));
const mapHref = computed(() => categoryMapHref(props.citySlug, props.category, props.filter));
const focusCategory = useState<string | null>('collection-category-focus', () => null);
const moodHref = (tag: string) => `${discoveryHref(props.basePath, { ...props.filter, q: undefined, tags: [tag], cursor: undefined })}#collection-discovery`;
function rememberCategory(event: MouseEvent, category: PublicCategory): void {
  if (!event.button && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) focusCategory.value = `${props.citySlug}/${category}`;
}
let stopMotion = () => {};
function startMotion(): void { stopMotion(); if (root.value) stopMotion = observeLivingRoute(root.value); }
watch(visiblePlaces, startMotion, { flush: 'post' });
onMounted(() => {
  startMotion();
  const row = root.value?.querySelector<HTMLElement>('.rd-collection-nav ul');
  const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
  if (row && active) {
    const box = row.getBoundingClientRect(), tab = active.getBoundingClientRect();
    if (tab.right > box.right) row.scrollBy({ left: tab.right - box.right + 8, behavior: 'instant' });
    else if (tab.left < box.left) row.scrollBy({ left: tab.left - box.left - 8, behavior: 'instant' });
  }
  if (focusCategory.value === `${props.citySlug}/${props.category}`) { focusCategory.value = null; active?.focus({ preventScroll: true }); }
});
onBeforeUnmount(() => stopMotion());
</script>

<template>
  <div ref="root" class="rd-category-guide" :data-category="category" :style="{ '--collection-accent': identity.accent, '--collection-paper': identity.surface }">
    <RdCategoryCover :category="category" :city-slug="citySlug" :city-name="city?.name ?? ''" :cover="cover" :map-href="mapHref" />
    <RdCategoryNavigator :city-slug="citySlug" :category="category" :base-path="basePath" :filter="filter" @navigate="rememberCategory" />
    <section id="collection-discovery" class="rd-field-discovery" aria-labelledby="collection-filter-title">
      <div class="rd-collection-filter-title"><p class="rd-field-kicker">Một nơi cho đúng nhịp đi</p><h2 id="collection-filter-title">Tìm một nơi <em>hợp gu.</em></h2></div>
      <RdDiscoveryFilter :action="basePath" :filter="filter" :tags="page?.tags ?? []" :map-href="mapHref" :fixed-category="category" :zones="city?.zones" />
      <RdPlaceListing :city-slug="citySlug" :base-path="basePath" :params="params" :page="page" :tags="filter.tags" :paged="Boolean(filter.cursor)" :failed="failed" :refreshing="pending" :now="now" field-guide :discovery-filter="filter" heading="Những nơi dành cho một lần ghé." @change="visiblePlaces = $event">
        <template #empty><div class="rd-field-empty"><span class="rd-field-empty__compass"><RdCategoryGlyph :category="category" /></span><h3>Những trang đầu đang được viết.</h3><p>Mục này mình chưa ghi chép chỗ nào. Bạn có thể đổi gu khám phá bên dưới hoặc ghé lại sau nhé.</p></div></template>
      </RdPlaceListing>
    </section>
    <section v-if="moods.length > 1" class="rd-collection-moods" data-rd-route-scene aria-labelledby="collection-moods-title">
      <div class="rd-field-section-heading"><p class="rd-field-kicker">Chọn cảm hứng, mở ghi chép</p><h2 id="collection-moods-title">Hôm nay bạn muốn <em>đi kiểu gì?</em></h2><p>Khám phá theo thẻ trong danh mục. Mỗi lựa chọn thay bộ thẻ đang lọc; số ghi chép theo khu vực và mái che, trước khi lọc thẻ và từ khóa.</p></div>
      <ul><li v-for="(mood, index) in moods" :key="mood.slug"><NuxtLink :to="moodHref(mood.slug)"><span class="rd-collection-moods__number" aria-hidden="true">0{{ index + 1 }}</span><span class="rd-field-kicker">{{ mood.label }}</span><h3>{{ mood.title }}</h3><span class="rd-collection-moods__action">{{ mood.count }} ghi chép có thẻ <span aria-hidden="true">↗</span></span></NuxtLink></li></ul>
    </section>
    <section class="rd-collection-map" data-rd-route-scene aria-labelledby="collection-map-title">
      <div class="rd-collection-map__copy"><p class="rd-field-kicker">Đổi góc nhìn, giữ gu khám phá</p><h2 id="collection-map-title">Những nơi này <em>nằm đâu?</em></h2><p>Mở bản đồ, xem vị trí thật và chọn điểm dừng tiếp theo. Danh mục và các lựa chọn của bạn được giữ lại.</p><NuxtLink class="rd-btn rd-btn--primary" :to="mapHref">Xem trên bản đồ <span aria-hidden="true">↗</span></NuxtLink></div>
      <div class="rd-collection-map__art" aria-hidden="true"><span class="rd-collection-map__compass"><RdCompass /></span><svg viewBox="0 0 360 120" fill="none"><path pathLength="1" d="M6 90C120 110 72 12 180 32S260 116 350 12" /><circle cx="6" cy="90" r="4" /><circle cx="350" cy="12" r="4" /></svg><span>Rẽ một chút.<br>Hay cả chuyến đi.</span></div>
      <p class="rd-collection-map__caption">MINH HỌA SỔ TAY · MỞ BẢN ĐỒ ĐỂ XEM VỊ TRÍ THẬT</p>
      <nav v-if="city?.zones.length" class="rd-collection-areas" aria-label="Mở ghi chép theo khu vực"><span>Hoặc ghé một khu</span><ul><li v-for="zone in city.zones" :key="zone.slug"><NuxtLink :to="categoryAreaHref(citySlug, zone.slug, category, filter)">{{ zone.name }} <span aria-hidden="true">↗</span></NuxtLink></li></ul></nav>
    </section>
    <section class="rd-collection-next" data-rd-route-scene aria-labelledby="collection-next-title">
      <div class="rd-field-section-heading"><p class="rd-field-kicker">Còn những chương khác</p><h2 id="collection-next-title">Đổi gu <em>một chút nhé?</em></h2><p>Một hương vị khác, một góc nhìn mới. Bắt đầu lại sở thích, giữ lựa chọn khu vực và mái che.</p></div>
      <ul><li v-for="item in alternatives" :key="item"><NuxtLink class="rd-collection-next__card" :to="categorySiblingHref(citySlug, item, filter)" :style="{ '--chapter-paper': CATEGORY_IDENTITY[item].surface }" @click="rememberCategory($event, item)"><span class="rd-collection-next__label">CHƯƠNG {{ String(PUBLIC_CATEGORIES.indexOf(item) + 1).padStart(2, '0') }} / KHÁM PHÁ</span><span class="rd-collection-next__glyph"><RdCategoryGlyph :category="item" /></span><h3>{{ CATEGORY_LABEL[item] }}</h3><p>{{ CATEGORY_IDENTITY[item].annotation }}</p><span class="rd-collection-next__action">Mở bộ sưu tập <span aria-hidden="true">↗</span></span></NuxtLink></li></ul>
    </section>
  </div>
</template>

<style src="../../../assets/local-field-guide.css"></style>
<style src="../../../assets/discovery-collection.css"></style>
