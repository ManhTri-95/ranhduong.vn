<script setup lang="ts">
import type { TagCount } from '@ranhduong/contracts';
import { computed } from 'vue';
import { tagChips } from '../lib/tag-chips';

const props = defineProps<{ action: string; tags: TagCount[]; selected: string[] }>();
const chips = computed(() => tagChips(props.tags, props.selected));

/**
 * Form GET thường: chưa có JS thì trình duyệt tự gửi `?tags=…` (mỗi nút mang sẵn giá trị sau khi bật/tắt thẻ).
 * Có JS thì chuyển trang bằng router, không tải lại cả trang, và bỏ `tags` rỗng khỏi URL.
 * Bot không gửi form, nên không đi lan ra mọi tổ hợp thẻ.
 */
async function onSubmit(event: SubmitEvent): Promise<void> {
  const button = event.submitter;
  if (!(button instanceof HTMLButtonElement)) return;
  event.preventDefault();
  await navigateTo(button.value ? { path: props.action, query: { tags: button.value } } : props.action);
}
</script>

<template>
  <form v-if="chips.length" method="get" :action="action" aria-label="Lọc theo thẻ" @submit="onSubmit">
    <ul class="chips">
      <li v-for="chip in chips" :key="chip.slug">
        <!-- Nhãn để cùng dòng với thẻ: xuống dòng thì HTML có khoảng trắng thừa quanh chữ. -->
        <button class="rd-chip rd-chip--filter" type="submit" name="tags" :value="chip.value" :aria-pressed="chip.pressed">{{ chip.label }}</button>
      </li>
    </ul>
  </form>
</template>

<style scoped>
/* 390px: một hàng cuộn ngang tràn sát mép màn hình, chip đầu vẫn thẳng lề trang; từ 768px xuống dòng. */
.chips { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; gap: var(--space-2); overflow-x: auto; scroll-padding-inline: var(--space-5); }
.chips li { flex: 0 0 auto; }
@media (min-width: 768px) { .chips { flex-wrap: wrap; overflow-x: visible; margin: 0; padding: 0; } }
</style>
