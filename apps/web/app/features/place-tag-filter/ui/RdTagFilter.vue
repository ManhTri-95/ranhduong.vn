<script setup lang="ts">
import type { TagCount } from '@ranhduong/contracts';
import { computed, onMounted, ref } from 'vue';
import { tagChips, visibleTagChips } from '../lib/tag-chips';

const props = defineProps<{ action: string; tags: TagCount[]; selected: string[] }>();
const chips = computed(() => tagChips(props.tags, props.selected));
const groups = computed(() => visibleTagChips(chips.value));
const selectedLabels = computed(() => chips.value.filter((chip) => chip.pressed).map((chip) => chip.label));
const form = ref<HTMLFormElement | null>(null);

// Đổi thẻ thì trang được dựng lại (key theo fullPath), nút vừa bấm bị thay bằng nút mới và focus rơi về <body>.
// Nhớ thẻ vừa bấm qua lần dựng lại, rồi trả focus về chip của thẻ đó (WCAG 2.4.3).
const focusSlug = useState<string | null>('tag-filter-focus', () => null);
onMounted(() => {
  const slug = focusSlug.value;
  if (!slug) return;
  focusSlug.value = null;
  const buttons = [...(form.value?.querySelectorAll<HTMLButtonElement>('button[name="tags"]') ?? [])];
  (buttons.find((button) => button.dataset.slug === slug) ?? buttons[0])?.focus();
});

/**
 * Form GET thường: chưa có JS thì trình duyệt tự gửi `?tags=…` (mỗi nút mang sẵn giá trị sau khi bật/tắt thẻ).
 * Có JS thì chuyển trang bằng router, không tải lại cả trang, và bỏ `tags` rỗng khỏi URL.
 * Bot không gửi form, nên không đi lan ra mọi tổ hợp thẻ.
 */
async function onSubmit(event: SubmitEvent): Promise<void> {
  const button = event.submitter;
  if (!(button instanceof HTMLButtonElement)) return;
  event.preventDefault();
  focusSlug.value = button.dataset.slug ?? null;
  await navigateTo(button.value ? { path: props.action, query: { tags: button.value } } : props.action);
}
</script>

<template>
  <form v-if="chips.length" ref="form" class="rd-tag-filter" method="get" :action="action" aria-labelledby="tag-filter-label" @submit="onSubmit">
    <p id="tag-filter-label" class="rd-tag-filter__label">Lọc theo thẻ</p>
    <!-- Xuống dòng, không cuộn ngang: bộ lọc chọn nhiều thẻ, thẻ nào cũng phải thấy được (kể cả thẻ đang chọn). -->
    <ul class="rd-tag-filter__chips">
      <li v-for="chip in groups.shown" :key="chip.slug">
        <!-- Nhãn để cùng dòng với thẻ: xuống dòng thì HTML có khoảng trắng thừa quanh chữ. -->
        <button class="rd-chip rd-chip--tag" type="submit" name="tags" :value="chip.value" :data-slug="chip.slug" :aria-pressed="chip.pressed"><svg v-if="chip.pressed" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>{{ chip.label }}<span v-if="chip.count" class="rd-chip__count">{{ chip.count }}</span><span v-if="chip.count" class="visually-hidden"> chỗ</span></button>
      </li>
    </ul>
    <details v-if="groups.hidden.length" class="rd-tag-filter__more">
      <summary class="rd-tag-filter__more-toggle">Thêm {{ groups.hidden.length }} thẻ</summary>
      <ul class="rd-tag-filter__chips">
        <li v-for="chip in groups.hidden" :key="chip.slug">
          <button class="rd-chip rd-chip--tag" type="submit" name="tags" :value="chip.value" :data-slug="chip.slug" :aria-pressed="chip.pressed">{{ chip.label }}<span v-if="chip.count" class="rd-chip__count">{{ chip.count }}</span><span v-if="chip.count" class="visually-hidden"> chỗ</span></button>
        </li>
      </ul>
    </details>
    <!-- Cho khách biết danh sách đang bị lọc và bỏ lọc bằng một chạm; link thường nên chạy cả khi tắt JavaScript. -->
    <p v-if="selectedLabels.length" class="rd-tag-filter__status" role="status">Đang lọc: {{ selectedLabels.join(', ') }} · <NuxtLink :to="action">Bỏ lọc</NuxtLink></p>
  </form>
</template>

<style scoped>
.rd-tag-filter { display: flex; flex-direction: column; gap: var(--space-2); }
.rd-tag-filter__label { margin: 0; font: 600 13px var(--font-body); color: var(--ink-soft); }
.rd-tag-filter__chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-tag-filter__more-toggle { display: inline-flex; align-items: center; min-height: var(--tap-min); font: 600 14px var(--font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.rd-tag-filter__more[open] .rd-tag-filter__chips { margin-top: var(--space-1); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-tag-filter__status { margin: 0; font-size: 14px; line-height: 1.5; }
.rd-tag-filter__status a { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
</style>
