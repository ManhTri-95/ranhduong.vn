<script setup lang="ts">
import type { CityPublic, PlaceListResponse } from '@ranhduong/contracts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { PlaceListParams } from '~/entities/place/api/places';
import { areaHref, areaMapHref, areaMoments, type AreaFilter } from '~/entities/place/lib/area-guide';
import { coordinateLabel } from '~/entities/place/lib/place-story';
import RdFieldPhoto from '~/entities/place/ui/RdFieldPhoto.vue';
import RdDiscoveryFilter from '~/features/place-tag-filter/ui/RdDiscoveryFilter.vue';
import { observeLivingRoute } from '~/shared/lib/living-route';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdDiscoveryStamp from '~/shared/ui/RdDiscoveryStamp.vue';
import RdAreaMapEntry from './RdAreaMapEntry.vue';
import RdPlaceListing from './RdPlaceListing.vue';

const props = defineProps<{ city: CityPublic | null; citySlug: string; zoneSlug: string; zoneName: string; basePath: string; filter: AreaFilter; params: PlaceListParams; page: PlaceListResponse | null; failed: boolean; now: Date | null }>();
const root = ref<HTMLElement | null>(null);
const navigator = ref<HTMLElement | null>(null);
const visiblePlaces = ref(props.page?.items ?? []);
const zones = computed(() => props.city?.zones ?? []);
const zoneNumber = computed(() => zones.value.findIndex(zone => zone.slug === props.zoneSlug) + 1);
const alternatives = computed(() => zones.value.filter(zone => zone.slug !== props.zoneSlug));
const cover = computed(() => props.page?.items.find(place => place.coverKey) ?? null);
const coordinates = computed(() => coordinateLabel(cover.value?.location));
const moments = computed(() => areaMoments(props.page?.tags ?? []));
const mapHref = computed(() => areaMapHref(props.citySlug, props.zoneSlug, props.filter));
const focusRegion = useState<string | null>('area-region-focus', () => null);
const regionHref = (slug: string) => areaHref(`/${props.citySlug}/khu-vuc/${slug}`, { ...props.filter, cursor: undefined });
const momentHref = (slug: string) => `${areaHref(props.basePath, { ...props.filter, q: undefined, tags: [slug], cursor: undefined })}#field-discovery`;
let stopMotion = () => {};
function rememberRegion(event: MouseEvent, slug: string): void {
  if (!event.button && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) focusRegion.value = `${props.citySlug}/${slug}`;
}
function startMotion(): void { stopMotion(); if (root.value) stopMotion = observeLivingRoute(root.value); }
watch(visiblePlaces, startMotion, { flush: 'post' });
onMounted(() => {
  startMotion();
  const row = navigator.value?.querySelector<HTMLElement>('ul');
  const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
  if (row && active) {
    const box = row.getBoundingClientRect();
    const chip = active.getBoundingClientRect();
    if (chip.right > box.right) row.scrollBy({ left: chip.right - box.right + 8, behavior: 'instant' });
    else if (chip.left < box.left) row.scrollBy({ left: chip.left - box.left - 8, behavior: 'instant' });
  }
  if (focusRegion.value === `${props.citySlug}/${props.zoneSlug}`) {
    focusRegion.value = null;
    navigator.value?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });
  }
});
onBeforeUnmount(() => stopMotion());
</script>

<template>
  <div ref="root" class="rd-area-guide">
    <header class="rd-field-hero" data-rd-route-scene>
      <div class="rd-field-hero__copy"><nav aria-label="Đường dẫn trang"><NuxtLink :to="`/${citySlug}`">{{ city?.name || 'Thành phố' }}</NuxtLink><span aria-hidden="true"> / </span><span>Khám phá khu vực</span></nav><p class="rd-field-kicker">RÀNH ĐƯỜNG / SỔ TAY ĐỊA PHƯƠNG</p><h1>{{ zoneName || 'Khu vực' }}<em v-if="city">{{ city.name }}</em></h1><p class="rd-field-hero__line">Những góc quen,<br>những điều chưa kể.</p><p class="rd-field-hero__description">Tìm một quán hợp gu, một chỗ để ghé. Rồi mở bản đồ và đi thêm một vòng.</p><div class="rd-field-hero__actions"><a class="rd-btn rd-btn--primary" href="#field-discovery">Khám phá trong khu <span aria-hidden="true">↓</span></a><NuxtLink :to="mapHref">Mở bản đồ <span aria-hidden="true">↗</span></NuxtLink></div></div>
      <figure class="rd-field-hero__postcard"><div class="rd-field-hero__image"><RdFieldPhoto :place="cover" priority sizes="(min-width: 1024px) 48vw, (min-width: 640px) 45vw, 100vw" /><RdDiscoveryStamp v-if="zoneNumber" class="rd-field-hero__stamp" label="KHU" :number="String(zoneNumber).padStart(2, '0')" /></div><figcaption><NuxtLink v-if="cover" :to="`/${citySlug}/dia-diem/${cover.slug}`">Một nơi trong khu · {{ cover.name }} ↗</NuxtLink><span v-else>Ghi chép khu {{ zoneName }} · Ảnh đang cập nhật</span><span v-if="coordinates" class="rd-field-hero__coordinates">{{ coordinates }}</span></figcaption><svg class="rd-field-hero__route" viewBox="0 0 420 95" fill="none" aria-hidden="true"><path pathLength="1" d="M8 70C65 85 44 15 126 20s58 72 145 51 78-68 140-60" /><circle cx="8" cy="70" r="5" /><circle cx="411" cy="11" r="5" /></svg></figure>
    </header>

    <nav v-if="zones.length" ref="navigator" class="rd-field-regions" aria-label="Khám phá theo khu vực"><p class="rd-field-kicker">Chọn một hướng</p><ul><li v-for="(zone, index) in zones" :key="zone.slug"><NuxtLink :to="regionHref(zone.slug)" :aria-current="zone.slug === zoneSlug ? 'page' : undefined" @click="rememberRegion($event, zone.slug)"><span aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>{{ zone.name }}<span aria-hidden="true">↗</span></NuxtLink></li></ul></nav>

    <section id="field-discovery" class="rd-field-discovery" aria-label="Khám phá địa điểm"><RdDiscoveryFilter :action="basePath" :filter="filter" :tags="page?.tags ?? []" :map-href="mapHref" /><RdPlaceListing :city-slug="citySlug" :base-path="basePath" :params="params" :page="page" :tags="filter.tags" :paged="Boolean(filter.cursor)" :failed="failed" :now="now" field-guide :discovery-filter="filter" @change="visiblePlaces = $event"><template #empty><div class="rd-field-empty"><span class="rd-field-empty__compass"><RdCompass /></span><h2>Một trang sổ tay đang được viết tiếp.</h2><p>Khu này mình chưa ghi chép chỗ nào.<template v-if="alternatives[0]"> Thử ghé <NuxtLink :to="regionHref(alternatives[0].slug)">khu {{ alternatives[0].name }}</NuxtLink> nhé?</template></p></div></template></RdPlaceListing></section>

    <section v-if="moments.length > 1" class="rd-field-moments" data-rd-route-scene aria-labelledby="field-moments-title"><div class="rd-field-section-heading"><p class="rd-field-kicker">Một khu, nhiều cách khám phá</p><h2 id="field-moments-title">Đi theo một <em>cảm hứng.</em></h2><p>Chọn một thẻ có trong ghi chép của khu vực. Các lựa chọn này thay bộ thẻ đang lọc.</p></div><ul><li v-for="(moment, index) in moments" :key="moment.slug"><NuxtLink :to="momentHref(moment.slug)"><span class="rd-field-moments__index" aria-hidden="true">0{{ index + 1 }} /</span><span class="rd-field-kicker">{{ moment.label }}</span><h3>{{ moment.title }}</h3><span class="rd-field-moments__action">Khám phá theo thẻ <span aria-hidden="true">↗</span></span></NuxtLink></li></ul></section>

    <RdAreaMapEntry :city="city" :city-slug="citySlug" :zone-slug="zoneSlug" :filter="filter" :places="visiblePlaces" />

    <section v-if="alternatives.length" class="rd-field-next" data-rd-route-scene aria-labelledby="field-next-title">
      <div class="rd-field-section-heading"><p class="rd-field-kicker">Còn những trang khác trong sổ tay</p><h2 id="field-next-title">Đi thêm một vòng <em>nữa nhé?</em></h2><p>Các khu vực khác trong {{ city?.name }}. Bộ lọc của bạn sẽ được giữ khi chuyển khu.</p></div>
      <ul>
        <li v-for="zone in alternatives" :key="zone.slug">
          <NuxtLink class="rd-field-next__card" :to="regionHref(zone.slug)" @click="rememberRegion($event, zone.slug)">
            <header><p class="rd-field-next__label">KHÁM PHÁ KHU VỰC</p><h3>{{ zone.name }}</h3></header>
            <p class="rd-field-next__description">Mở trang ghi chép khu {{ zone.name }}, tìm thêm một nơi bạn muốn ghé.</p>
            <div class="rd-field-next__visual" aria-hidden="true"><span class="rd-field-next__compass"><RdCompass /></span><span class="rd-field-next__annotation">Rẽ thêm<br>một chút.</span></div>
            <span class="rd-field-next__action">Khám phá khu <span aria-hidden="true">↗</span></span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style src="../../../assets/local-field-guide.css"></style>
