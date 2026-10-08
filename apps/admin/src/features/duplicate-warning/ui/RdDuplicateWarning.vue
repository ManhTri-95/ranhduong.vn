<script setup lang="ts">
import type { DuplicateMatch } from '@ranhduong/contracts';
import { duplicateHeading, matchMeta } from '../lib/match-meta';

defineProps<{ matches: readonly DuplicateMatch[]; failed: boolean }>();
</script>

<template>
  <div v-if="matches.length > 0" class="rd-callout rd-callout--warn warning" role="status">
    <p class="title">{{ duplicateHeading(matches) }}</p>
    <ul class="list">
      <li v-for="match in matches" :key="match.id">
        <!-- Mở tab mới để không rời form đang sửa. -->
        <a :href="`/dia-diem/${match.id}`" target="_blank" rel="noopener">{{ match.name }}</a>
        <span class="meta">{{ matchMeta(match) }}</span>
      </li>
    </ul>
    <p class="hint">Mở chỗ đó xem trước khi lưu. Nếu đúng là chỗ khác (ví dụ chi nhánh), cứ lưu bình thường.</p>
  </div>
  <p v-else-if="failed" class="rd-field__hint">Chưa kiểm tra được trùng, sẽ thử lại khi bạn sửa tên hoặc ghim.</p>
</template>

<style scoped>
.warning { display: flex; flex-direction: column; gap: var(--space-1); }
.title, .hint { margin: 0; }
.title { font-weight: 700; }
.list { margin: 0; padding: 0; list-style: none; }
.list li { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--space-2); }
.list a { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 700; }
.meta { font-size: 13px; }
</style>
