<script setup lang="ts">
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
import RdCompass from '~/shared/ui/RdCompass.vue';
defineProps<{ citySlug?: string }>();
const contactEmail = useRuntimeConfig().public.legalContactEmail;
const year = new Date().getFullYear();
</script>

<template>
  <footer :class="['rd-footer', { 'rd-footer--editorial': citySlug }]">
    <div v-if="citySlug" class="rd-footer__editorial">
      <div class="rd-footer__brand"><NuxtLink :to="`/${citySlug}`">Rành Đường <span class="rd-footer__compass"><RdCompass /></span></NuxtLink><span class="rd-footer__localx">LOCALX · CẨM NANG ĐỊA PHƯƠNG</span><p>Rẽ một chút. Hay cả chuyến đi.<br>Ghi chép địa phương, cho những chuyến đi của bạn.</p></div>
      <nav aria-label="Khám phá điểm đến"><h2>Khám phá</h2><NuxtLink :to="`/${citySlug}/ca-phe`">Cà phê</NuxtLink><NuxtLink :to="`/${citySlug}/an-uong`">Ăn uống</NuxtLink><NuxtLink :to="`/${citySlug}/tham-quan`">Tham quan</NuxtLink><NuxtLink :to="`/${citySlug}/hoat-dong`">Hoạt động</NuxtLink></nav>
      <nav aria-label="Hành trình"><h2>Lên đường</h2><NuxtLink :to="`/${citySlug}/ban-do`">Bản đồ khám phá</NuxtLink><NuxtLink :to="`/${citySlug}#lich-trinh`">Lịch trình gợi ý</NuxtLink><NuxtLink :to="`/${citySlug}#cam-hung`">Cảm hứng du lịch</NuxtLink><a v-if="contactEmail" :href="`mailto:${contactEmail}`">Liên hệ</a></nav>
    </div>
    <div class="rd-footer__inner">
      <p>{{ citySlug ? `© ${year} Rành Đường · Đi để có chuyện hay.` : 'Rành Đường · Sổ tay Đà Lạt' }}</p>
      <nav aria-label="Thông tin pháp lý">
        <NuxtLink v-for="page in LEGAL_PAGES" :key="page.path" :to="page.path">{{ page.title }}</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.rd-footer { border-top: var(--border); padding: var(--space-5) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom, 0px)); }
.rd-footer__inner { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.rd-footer p { margin: 0; font-size: 13px; color: var(--ink-soft); }
.rd-footer nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
.rd-footer a { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 13px; }
.rd-footer a[aria-current='page'] { font-weight: 700; }
.rd-footer--editorial { border-top: 0; padding: var(--space-12) var(--editorial-gutter) calc(var(--space-6) + env(safe-area-inset-bottom, 0px)); }
.rd-footer__editorial { max-width: var(--content-max); margin: 0 auto var(--space-8); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); }
.rd-footer__brand { grid-column: 1 / -1; }
.rd-footer__brand > a { font: 700 30px/1.3 var(--font-display); text-decoration: none; }
.rd-footer__brand > a span { margin-left: var(--space-3); }
.rd-footer__compass { display: inline-block; width: 32px; height: 32px; vertical-align: middle; color: var(--route-rust); }
.rd-footer__localx { display: block; font-size: 8px; letter-spacing: 0.1em; font-weight: 600; margin: var(--space-3) 0 var(--space-5); }
.rd-footer__brand p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.8; }
.rd-footer__editorial nav { display: flex; flex-direction: column; gap: 0; }
.rd-footer__editorial nav h2 { font-size: 12px; margin: 0 0 var(--space-3); }
.rd-footer__editorial nav a { text-decoration: none; font-size: 11px; }
.rd-footer--editorial .rd-footer__inner { border-top: 1px solid var(--line); padding-top: var(--space-5); }
.rd-footer--editorial .rd-footer__inner p, .rd-footer--editorial .rd-footer__inner a { font-size: 10px; }
@media (min-width: 768px) { .rd-footer__editorial { grid-template-columns: 2fr 1fr 1fr; gap: var(--space-16); } .rd-footer__brand { grid-column: auto; } }
.rd-footer__editorial > * { min-width: 0; }
.rd-footer__brand p, .rd-footer__editorial nav a, .rd-footer--editorial .rd-footer__inner a, .rd-footer--editorial .rd-footer__inner p { font-size: var(--text-utility); line-height: 1.6; }
.rd-footer__localx { font-size: var(--text-caption); }
.rd-footer__editorial nav h2 { font-size: var(--text-utility); }
</style>
