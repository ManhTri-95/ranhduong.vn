<script setup lang="ts">
import type { CuratedListSummary } from '@ranhduong/contracts';
defineProps<{ citySlug: string; lists: CuratedListSummary[]; failed: boolean }>();
</script>
<template>
  <section v-if="lists.length || failed" class="rd-curated-strip" aria-labelledby="curated-heading">
    <h2 id="curated-heading" class="section-title">Gợi ý theo chủ đề</h2>
    <p v-if="failed" class="empty-note">Chưa tải được các danh sách gợi ý, thử lại ở đầu trang nhé.</p>
    <ul v-else class="rd-curated-strip__lists">
      <li v-for="list in lists" :key="list.slug">
        <NuxtLink class="rd-curated-strip__card" :to="`/${citySlug}/top/${list.slug}`">
          <span class="rd-curated-strip__count">{{ list.placeCount }} địa điểm</span>
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
.rd-curated-strip__lists { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.rd-curated-strip__card { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); height: 100%; box-sizing: border-box; text-decoration: none; color: var(--ink); overflow-wrap: anywhere; }
.rd-curated-strip__card h3 { margin: 0; font: 700 20px/1.3 var(--font-display); }
.rd-curated-strip__card p { margin: 0; color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.rd-curated-strip__count { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
.rd-curated-strip__open { margin-top: auto; font-weight: 600; }
@media (min-width: 768px) { .rd-curated-strip__lists { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
