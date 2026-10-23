<script setup lang="ts">
import type { CuratedListSummary } from '@ranhduong/contracts';
defineProps<{ citySlug: string; lists: CuratedListSummary[]; failed: boolean }>();
</script>
<template>
  <section class="rd-curated-strip" aria-labelledby="curated-heading">
    <h2 id="curated-heading" class="section-title">Chuyện hay trên những cung đường</h2>
    <p class="rd-curated-strip__intro">Một vài danh sách gợi ý, để mỗi lần lên đường đều có thêm điều thú vị.</p>
    <p v-if="failed" class="empty-note">Chưa tải được các danh sách gợi ý, thử lại ở đầu trang nhé.</p>
    <p v-else-if="!lists.length" class="empty-note">Những ghi chép đầu tiên đang được biên soạn. Trong lúc chờ, bạn có thể khám phá địa điểm trên bản đồ.</p>
    <ul v-else class="rd-curated-strip__lists">
      <li v-for="(list, index) in lists" :key="list.slug">
        <NuxtLink class="rd-curated-strip__card" :to="`/${citySlug}/top/${list.slug}`">
          <span class="rd-curated-strip__number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="rd-curated-strip__count">Danh sách · {{ list.placeCount }} địa điểm</span>
          <h3>{{ list.title }}</h3>
          <p v-if="list.description">{{ list.description }}</p>
          <span class="rd-curated-strip__open">Mở danh sách →</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
<style scoped>
.rd-curated-strip { display: flex; flex-direction: column; gap: var(--space-3); }
.rd-curated-strip__intro { max-width: 600px; margin: 0 0 var(--space-5); font-size: 13px; line-height: 1.8; color: var(--ink-soft); }
.rd-curated-strip__number { font: 700 44px/1.2 var(--font-display); color: var(--ink-soft); }
.rd-curated-strip__lists { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.rd-curated-strip__card { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); height: 100%; box-sizing: border-box; text-decoration: none; color: var(--ink); overflow-wrap: anywhere; }
.rd-curated-strip__card h3 { margin: 0; font: 700 20px/1.3 var(--font-display); }
.rd-curated-strip__card p { margin: 0; color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rd-curated-strip__count { font-size: 12px; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.rd-curated-strip__open { margin-top: auto; font-weight: 600; }
@media (min-width: 768px) { .rd-curated-strip__lists { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
/* Điện thoại: từ 2 danh sách thì cuộn ngang, thẻ sau ló ra để gợi ý còn nữa. */
@media (max-width: 767.98px) {
  .rd-curated-strip__lists { margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--space-5); scrollbar-width: none; }
  .rd-curated-strip__lists > li { flex: 0 0 min(300px, 85%); scroll-snap-align: start; }
  .rd-curated-strip__lists > li:only-child { flex-basis: 100%; }
}
</style>
