<script setup lang="ts">
import type { CityPublic } from '@ranhduong/contracts';
import { computed } from 'vue';
import RdSearchForm from '~/features/place-search/ui/RdSearchForm.vue';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdDestinationPhoto from '~/shared/ui/RdDestinationPhoto.vue';

const props = defineProps<{ citySlug: string; cityName: string; center?: CityPublic['center'] }>();
const coordinates = computed(() => {
  if (!props.center) return '';
  const [lng, lat] = props.center.coordinates;
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'B' : 'N'} / ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'Đ' : 'T'}`;
});
</script>

<template>
  <section class="rd-home-hero" aria-labelledby="home-title">
    <div class="rd-home-hero__image">
      <RdDestinationPhoto photo="landscape" :city-slug="citySlug" priority />
      <svg class="rd-home-hero__route" viewBox="0 0 650 150" fill="none" aria-hidden="true"><path d="M0 20C140 20 80 130 240 100S420-10 490 65s100 100 160 50" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 7" /><circle cx="240" cy="100" r="6" fill="currentColor" /></svg>
    </div>
    <div class="rd-home-hero__content rd-home-container">
      <div class="rd-home-hero__topline">
        <RdChapterLabel number="01" :label="`Mở sổ · ${cityName || 'Việt Nam'}`" />
        <span v-if="coordinates" class="rd-home-hero__coordinates">TÂM THÀNH PHỐ<br>{{ coordinates }}</span>
      </div>
      <h1 id="home-title"><span class="rd-home-hero__mask"><span>Rẽ một chút.</span></span><span class="rd-home-hero__mask"><em>Hay cả chuyến đi.</em></span></h1>
      <div class="rd-home-hero__story">
        <p class="rd-home-hero__lead">Những nơi hay ho đôi khi nằm<br>ngay sau một ngã rẽ.</p>
        <p class="rd-home-hero__product">Khám phá địa điểm, mở bản đồ và chọn một lịch trình ở {{ cityName || 'điểm đến' }}. Người rành đường ghi lại. Bạn tự chọn cách đi.</p>
      </div>
      <div class="rd-home-hero__actions"><a class="rd-btn rd-btn--primary rd-home-hero__primary" href="#hanh-trinh-kham-pha">Đi một vòng <span aria-hidden="true">↗</span></a><a class="rd-home-hero__secondary" href="#lich-trinh">Tìm một lịch trình →</a></div>
      <div class="rd-home-hero__search"><span class="rd-home-hero__destination">⌖ {{ cityName || 'Điểm đến' }}</span><RdSearchForm :action="`/${citySlug}/tim-kiem`" :city-slug="citySlug" /></div>
      <div class="rd-home-hero__stamp" aria-hidden="true"><RdCompass /><span>ĐI MỘT VÒNG<br>BIẾT THÊM MỘT NƠI</span></div>
      <span class="rd-home-hero__annotation" aria-hidden="true">Một chút tò mò,<br>một chuyến đi khác.</span>
    </div>
    <div class="rd-home-hero__bottom rd-home-container"><a href="#hanh-trinh-kham-pha" class="rd-home-hero__scroll"><span aria-hidden="true">↓</span> LẬT TRANG, ĐI TIẾP</a><NuxtLink v-if="citySlug === 'da-lat'" to="/ghi-nguon#anh-trang-chu">Ảnh tư liệu: Tri Nguyen · CC0 ↗</NuxtLink></div>
  </section>
</template>

<style scoped>
.rd-home-hero { position: relative; isolation: isolate; z-index: 4; color: var(--paper-raised); background: var(--ink); }
.rd-home-hero__image { position: absolute; inset: 0; z-index: -2; overflow: hidden; }
.rd-home-hero__image::after { content: ''; position: absolute; inset: 0; background: var(--editorial-overlay); }
.rd-home-hero__content { position: relative; padding-top: var(--space-8); padding-bottom: var(--space-10); }
.rd-home-hero__topline { display: flex; justify-content: space-between; align-items: start; gap: var(--space-4); }
.rd-home-hero__topline :deep(.rd-chapter) { font-size: 9px; margin: 0; }
.rd-home-hero__coordinates { display: none; font: 10px/1.8 var(--font-coordinate); letter-spacing: 0.06em; text-align: right; }
.rd-home-hero h1 { position: relative; z-index: 1; max-width: 1000px; margin: var(--space-10) 0 var(--space-6); font: 700 clamp(36px, 7.2vw, 96px)/1.16 var(--font-display); letter-spacing: -0.055em; }
.rd-home-hero__mask { display: block; overflow: hidden; padding-block: 0.06em; margin-block: -0.06em; }
.rd-home-hero__mask > span, .rd-home-hero__mask > em { display: block; }
.rd-home-hero h1 em { color: var(--route-highlight); font-style: italic; }
.rd-home-hero__story { display: grid; gap: var(--space-4); max-width: 680px; }
.rd-home-hero__lead { margin: 0; font-size: 15px; line-height: 1.8; }
.rd-home-hero__product { margin: 0; max-width: 340px; font-size: var(--text-body); line-height: 1.9; }
.rd-home-hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-6); margin: var(--space-6) 0; }
.rd-home-hero__primary { background: var(--brand-primary); color: var(--brand-primary-foreground); border-radius: var(--radius-postcard); padding-inline: var(--space-6);  border: var(--border-hair) solid var(--paper-raised);}
.rd-home-hero__primary > span { margin-left: var(--space-6); font-size: 24px; }
.rd-home-hero__secondary { display: inline-flex; align-items: center; gap: var(--space-4); min-height: var(--tap-min); color: inherit; font-size: var(--text-utility); text-underline-offset: 6px; }
.rd-home-hero__search { position: relative; z-index: 5; display: flex; flex-direction: column; max-width: 590px; border-radius: var(--radius-postcard); background: var(--paper-raised); color: var(--ink); padding: var(--space-2) var(--space-3); }
.rd-home-hero__destination { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 12px; font-weight: 600; }
.rd-home-hero__search :deep(.rd-search) { flex: 1; min-width: 0; }
.rd-home-hero__search :deep(.rd-search__label) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.rd-home-hero__search :deep(.rd-search__field) { border: 0; padding-left: 0; height: var(--tap-min); }
.rd-home-hero__search :deep(input) { font-size: 16px; }
.rd-home-hero__search :deep(.submit) { background: var(--brand-primary); color: var(--brand-primary-foreground); margin: 0; border-radius: var(--radius-postcard); }
.rd-home-hero__stamp, .rd-home-hero__annotation { display: none; }
.rd-home-hero__bottom { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding-block: var(--space-4); }
.rd-home-hero__bottom a { display: inline-flex; align-items: center; min-height: var(--tap-min); color: inherit; font-size: 9px; text-decoration: none; }
.rd-home-hero__scroll { gap: var(--space-3); letter-spacing: 0.08em; }
.rd-home-hero__scroll > span { font-size: 24px; }
.rd-home-hero__route { position: absolute; bottom: -30px; right: -100px; width: 60%; max-width: 600px; color: var(--route-highlight); opacity: 0.5; pointer-events: none; }
.rd-home-hero :focus-visible { outline-color: var(--route-highlight); }
.rd-home-hero__search :deep(:focus-visible) { outline-color: var(--ink); }
.rd-home-hero__search :deep(.submit:focus-visible) { outline-color: var(--route-highlight); }
@media (min-width: 768px) {
  .rd-home-hero__content { padding-top: var(--space-10); padding-bottom: var(--space-12); }
  .rd-home-hero__coordinates { display: block; }
  .rd-home-hero__story { grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: center; }
  .rd-home-hero__product { border-left: 1px solid color-mix(in srgb, var(--paper-raised) 40%, transparent); padding-left: var(--space-6); }
  .rd-home-hero__search { flex-direction: row; align-items: center; gap: var(--space-4); }
  .rd-home-hero__destination { padding-right: var(--space-4); border-right: 1px solid var(--line); }
}
@media (min-width: 1100px) {
  .rd-home-hero__stamp { display: grid; justify-items: center; gap: var(--space-2); position: absolute; width: 126px; right: var(--editorial-gutter); top: 185px; transform: rotate(10deg); }
  .rd-home-hero__stamp :deep(.rd-compass) { height: 126px; }
  .rd-home-hero__stamp > span { font: 600 8px/1.7 var(--font-body); letter-spacing: 0.1em; text-align: center; }
  .rd-home-hero__annotation { display: block; position: absolute; bottom: var(--space-12); right: 12%; font: 400 25px/1.3 var(--font-hand); transform: rotate(-8deg); }
}
@media (prefers-reduced-motion: no-preference) {
  .rd-home-hero__image :deep(img) { animation: rd-hero-depth var(--dur-route) var(--ease-route) both; }
  .rd-home-hero__mask > span, .rd-home-hero__mask > em { animation: rd-hero-turn var(--dur-route) var(--ease-route) both; }
  .rd-home-hero__mask:nth-child(2) > em { animation-delay: 100ms; }
  @keyframes rd-hero-turn { from { transform: translateY(105%) rotate(2deg); } to { transform: none; } }
  @keyframes rd-hero-depth { from { transform: scale(1.035); clip-path: inset(0 6% 0 0); } to { transform: scale(1); clip-path: inset(0); } }
}
</style>
