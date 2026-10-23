<script setup lang="ts">
import RdCompass from '~/shared/ui/RdCompass.vue';
// Lát 1 chỉ có Đà Lạt: hiện tên thành phố, chưa có nút chọn thành phố.
defineProps<{ citySlug: string; cityName: string; editorial?: boolean; sectionBase?: string; deferMap?: boolean }>();
</script>

<template>
  <header :class="['header', { 'header--editorial': editorial }]">
    <NuxtLink class="header__logo" :to="`/${citySlug}`"><span v-if="editorial" class="header__mark"><RdCompass /></span><span>Rành Đường<small v-if="editorial">ĐI MỘT VÒNG, BIẾT THÊM MỘT NƠI.</small></span></NuxtLink>
    <nav v-if="editorial" class="header__nav" aria-label="Điều hướng chính"><a :href="`${sectionBase ?? ''}#kham-pha`">Khám phá</a><a :href="`${sectionBase ?? ''}#lich-trinh`">Lịch trình</a><a :href="`${sectionBase ?? ''}#cam-hung`">Cảm hứng</a></nav>
    <span v-if="cityName" class="header__city"><span class="header__dot" aria-hidden="true" />{{ cityName }}</span>
    <NuxtLink v-if="editorial" class="header__map" :to="`/${citySlug}/ban-do`" :prefetch="!deferMap">Mở bản đồ <span aria-hidden="true">↗</span></NuxtLink>
  </header>
</template>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5); }
.header__logo { display: inline-flex; align-items: center; min-height: var(--tap-min); font: 700 24px/1 var(--font-display); letter-spacing: -0.3px; color: var(--ink); text-decoration: none; }
.header__city { display: inline-flex; align-items: center; gap: var(--space-2); height: var(--tap-min); padding: 0 var(--space-4); border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--paper-raised); font: 600 14px/1 var(--font-body); }
.header__dot { width: 10px; height: 10px; border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--accent); }
.header--editorial { max-width: calc(var(--content-max) + 2 * var(--editorial-gutter)); padding: var(--space-4) var(--editorial-gutter); flex-wrap: wrap; }
.header--editorial .header__logo { font-size: 21px; gap: var(--space-2); }
.header__logo small { display: block; margin-top: var(--space-2); font: 600 7px/1.5 var(--font-body); letter-spacing: 0.12em; }
.header__mark { display: grid; place-items: center; width: 44px; height: 44px; color: var(--route-rust); }
.header--editorial .header__city { margin-left: auto; padding-inline: var(--space-3); border: 0; background: transparent; font-size: 11px; }
.header--editorial .header__dot { width: 6px; height: 6px; border: 0; background: var(--ink); }
.header__nav { display: flex; justify-content: space-between; order: 3; width: 100%; gap: var(--space-5); border-top: 1px solid var(--line); }
.header__nav a { display: inline-flex; align-items: center; min-height: var(--tap-min); text-decoration: none; font-size: 11px; font-weight: 600; }
.header__map { display: none; align-items: center; justify-content: center; gap: var(--space-5); min-height: var(--tap-min); padding-inline: var(--space-4); background: var(--ink); color: var(--paper-raised); border-radius: var(--radius-pill); text-decoration: none; font-size: 11px; font-weight: 600; }
.header__map:focus-visible { outline-color: var(--ink); }
@media (min-width: 900px) { .header--editorial { flex-wrap: nowrap; gap: var(--space-7); padding-block: var(--space-5); } .header__nav { order: initial; width: auto; margin-inline: auto; border: 0; gap: var(--space-6); } .header--editorial .header__city { margin-left: 0; } .header__map { display: inline-flex; } }
</style>
