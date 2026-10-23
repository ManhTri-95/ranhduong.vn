<script setup lang="ts">
import { CATEGORY_LABEL, type PlaceCard } from '@ranhduong/contracts';
import RdPlacePhoto from '~/entities/place/ui/RdPlacePhoto.vue';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';

defineProps<{ citySlug: string; places: PlaceCard[] }>();
</script>

<template>
  <section id="hanh-trinh-kham-pha" class="rd-route-story rd-home-section" data-rd-route-scene aria-labelledby="route-story-title">
    <RdChapterLabel number="03" label="Cứ theo một chút tò mò" />
    <div class="rd-home-heading"><h2 id="route-story-title">Một ngã rẽ.<br><em>Thêm một câu chuyện.</em></h2><p>Không cần biết hết mọi con đường.<br>Bắt đầu từ một nơi khiến bạn tò mò.</p></div>
    <div v-if="places.length" class="rd-route-story__journey">
      <svg class="rd-route-story__path" viewBox="0 0 1100 450" preserveAspectRatio="none" fill="none" aria-hidden="true"><path class="rd-route-story__guide" d="M100 70C240-20 220 430 500 300S800-30 1030 150" /><path class="rd-route-story__ink" pathLength="1000" d="M100 70C240-20 220 430 500 300S800-30 1030 150" /></svg>
      <article v-for="(place, index) in places.slice(0, 3)" :key="place.slug" class="rd-route-story__stop">
        <span class="rd-route-story__marker" aria-hidden="true">0{{ index + 1 }}</span>
        <NuxtLink :to="`/${citySlug}/dia-diem/${place.slug}`" class="rd-route-story__card">
          <div class="rd-route-story__photo" :class="{ 'rd-route-story__photo--missing': !place.coverKey }">
            <RdPlacePhoto :name="place.name" :category="place.category" :photo-key="place.coverKey" sizes="(min-width: 768px) 28vw, 80vw" decorative />
          </div>
          <span class="rd-route-story__category">{{ CATEGORY_LABEL[place.category] }}{{ place.zoneName ? ` / ${place.zoneName}` : '' }}</span>
          <h3>{{ place.name }} <span aria-hidden="true">↗</span></h3>
          <p v-if="place.note" class="rd-route-story__note">{{ place.note }}</p>
          <span v-else class="rd-route-story__note">Mở sổ, xem ghi chép về nơi này.</span>
        </NuxtLink>
      </article>
    </div>
    <p v-else class="empty-note">Những điểm ghé đầu tiên đang được cập nhật. Bạn vẫn có thể chọn danh mục bên dưới.</p>
    <div class="rd-route-story__footnote"><span aria-hidden="true">↳</span><p>Vài điểm ghé gợi ý, không phải tuyến chỉ đường.<br>Còn đi theo thứ tự nào, bạn quyết định.</p><a class="rd-home-text-link" href="#dia-diem">Nhặt thêm vài nơi hay ↗</a></div>
  </section>
</template>

<style scoped>
.rd-route-story { position: relative; }
.rd-route-story__journey { position: relative; display: grid; gap: var(--space-8); padding-left: var(--space-10); margin-top: var(--space-10); }
.rd-route-story__journey::before { content: ''; position: absolute; top: 0; bottom: 0; left: var(--space-3); border-left: 1px dashed var(--route-rust); opacity: 0.5; }
.rd-route-story__path { display: none; }
.rd-route-story__stop { position: relative; min-width: 0; }
.rd-route-story__marker { position: absolute; left: calc(-1 * var(--space-10)); top: 0; display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid var(--route-rust); border-radius: var(--radius-pill); background: var(--paper); color: var(--route-rust); font: 11px var(--font-coordinate); }
.rd-route-story__card { display: block; color: var(--ink); text-decoration: none; }
.rd-route-story__photo { aspect-ratio: 4 / 3; overflow: hidden; background: var(--mist); border-radius: var(--radius-postcard); }
.rd-route-story__photo--missing { aspect-ratio: 2.3; }
.rd-route-story__photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.rd-route-story__no-photo { height: 100%; display: grid; place-content: center; justify-items: center; gap: var(--space-3); font-size: 12px; color: var(--ink-soft); }
.rd-route-story__no-photo :deep(svg) { width: 44px; height: 44px; }
.rd-route-story__category { display: block; margin-top: var(--space-4); font: 10px/1.7 var(--font-coordinate); color: var(--ink-soft); }
.rd-route-story h3 { display: flex; gap: var(--space-4); justify-content: space-between; margin: var(--space-2) 0; font: 700 21px/1.4 var(--font-display); }
.rd-route-story h3 > span { font: 24px var(--font-body); }
.rd-route-story__note { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font: 400 20px/1.35 var(--font-hand); color: var(--ink-soft); margin: var(--space-3) 0 0; }
.rd-route-story__footnote { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin-top: var(--space-8); }
.rd-route-story__footnote > span { font: 44px var(--font-hand); color: var(--route-rust); }
.rd-route-story__footnote p { margin: 0; font-size: 11px; line-height: 1.8; color: var(--ink-soft); }
.rd-route-story__footnote > a { margin-left: auto; }
@media (min-width: 768px) {
  .rd-route-story__journey { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-10); padding: var(--space-7) var(--space-3) 0; }
  .rd-route-story__journey::before { display: none; }
  .rd-route-story__path { display: block; position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; stroke: var(--route-rust); }
  .rd-route-story__guide { stroke-width: 1; stroke-dasharray: 3 8; opacity: 0.2; }
  .rd-route-story__ink { stroke-width: 1.5; stroke-dasharray: 1000; stroke-dashoffset: calc(1000 * (1 - var(--rd-route-progress, 1))); }
  .rd-route-story__stop { margin-top: var(--space-10); }
  .rd-route-story__stop:nth-of-type(2) { margin-top: 140px; }
  .rd-route-story__stop:nth-of-type(3) { margin-top: 0; }
  .rd-route-story__marker { position: relative; left: auto; margin-bottom: var(--space-4); width: 34px; height: 34px; }
}
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) { .rd-route-story__photo img { transform: scale(1.03) translateY(calc((1 - var(--rd-route-progress, 1)) * 12px)); } }
</style>
