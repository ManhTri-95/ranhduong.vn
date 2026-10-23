<script setup lang="ts">
import { CATEGORY_LABEL, PUBLIC_CATEGORIES, type PlaceCard, type PublicCategory } from '@ranhduong/contracts';
import { computed } from 'vue';
import { CATEGORY_IDENTITY } from '~/entities/place/lib/category-guide';
import RdCategoryGlyph from '~/entities/place/ui/RdCategoryGlyph.vue';
import RdFieldPhoto from '~/entities/place/ui/RdFieldPhoto.vue';
const props = defineProps<{ category: PublicCategory; citySlug: string; cityName: string; cover: PlaceCard | null; mapHref: string }>();
const identity = computed(() => CATEGORY_IDENTITY[props.category]);
const chapter = computed(() => String(PUBLIC_CATEGORIES.indexOf(props.category) + 1).padStart(2, '0'));
</script>

<template>
  <header class="rd-collection-cover" data-rd-route-scene>
    <nav class="rd-collection-breadcrumb" aria-label="Đường dẫn trang"><NuxtLink :to="`/${citySlug}`">{{ cityName || 'Thành phố' }}</NuxtLink><span aria-hidden="true"> / </span><span>{{ CATEGORY_LABEL[category] }}</span></nav>
    <div class="rd-collection-cover__edition"><p class="rd-field-kicker">RÀNH ĐƯỜNG / BỘ SƯU TẬP NHỮNG NƠI ĐÁNG GHÉ</p><span>CHƯƠNG {{ chapter }} <span aria-hidden="true">↘</span></span></div>
    <div class="rd-collection-cover__layout">
      <div class="rd-collection-cover__copy">
        <h1>{{ CATEGORY_LABEL[category] }}<em v-if="cityName"> ở {{ cityName }}</em></h1>
        <p class="rd-collection-cover__statement"><span v-for="line in identity.lines" :key="line">{{ line }}</span></p>
        <p class="rd-collection-cover__description">{{ identity.description }}</p>
        <div class="rd-collection-cover__actions"><a class="rd-btn rd-btn--primary" href="#collection-discovery">Tìm nơi hợp gu <span aria-hidden="true">↓</span></a><NuxtLink :to="mapHref">Xem trên bản đồ <span aria-hidden="true">↗</span></NuxtLink></div>
      </div>
      <figure class="rd-collection-cover__visual" :class="{ 'rd-collection-cover__visual--photo': cover }">
        <div class="rd-collection-cover__art">
          <RdFieldPhoto v-if="cover" :place="cover" priority sizes="(min-width: 1024px) 40vw, (min-width: 640px) 45vw, 100vw" />
          <template v-else>
            <svg class="rd-collection-cover__orbits" viewBox="0 0 400 320" fill="none" aria-hidden="true"><circle cx="200" cy="160" r="110" /><circle cx="200" cy="160" r="132" stroke-dasharray="2 6" /><path pathLength="1" d="M12 280C110 285 68 148 164 116S275 197 388 36" /></svg>
            <span class="rd-collection-cover__glyph"><RdCategoryGlyph :category="category" /></span>
            <span class="rd-collection-cover__annotation">{{ identity.annotation }}</span>
            <span class="rd-collection-cover__folio" aria-hidden="true">{{ chapter }}</span>
          </template>
          <span class="rd-collection-cover__stamp">{{ CATEGORY_LABEL[category] }}<small>SỔ TAY RÀNH ĐƯỜNG</small></span>
        </div>
        <figcaption><NuxtLink v-if="cover" :to="`/${citySlug}/dia-diem/${cover.slug}`">Trong bộ sưu tập · {{ cover.name }} <span aria-hidden="true">↗</span></NuxtLink><span v-else>Minh họa danh mục · Ảnh địa điểm đang cập nhật</span><span aria-hidden="true">{{ chapter }} / RD</span></figcaption>
      </figure>
    </div>
  </header>
</template>
