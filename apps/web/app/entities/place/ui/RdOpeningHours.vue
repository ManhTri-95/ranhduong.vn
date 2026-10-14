<script setup lang="ts">
import type { PlaceDetail } from '@ranhduong/contracts';
import { computed } from 'vue';
import { openingHoursRows, vietnamWeekday } from '../lib/place-detail';

// Trạng thái đang mở/đóng nằm dưới tên quán (RdPlaceDetail); thẻ này cho giờ hôm nay và giờ từng ngày (ui-spec mục 4).
const props = defineProps<{ place: PlaceDetail; now: Date | null }>();
const rows = computed(() => openingHoursRows(props.place.openingHours));
// Chỉ biết "hôm nay" sau khi chạy trên trình duyệt: HTML cache SWR không được chứa ngày lúc render.
const today = computed(() => (props.now ? vietnamWeekday(props.now) : null));
const todayRow = computed(() => rows.value.find((row) => row.day === today.value));
</script>

<template>
  <section class="rd-hours" aria-labelledby="opening-hours-title">
    <h2 id="opening-hours-title" class="section-title">Giờ mở cửa</h2>
    <template v-if="rows.length">
      <p class="rd-hours__today">
        <template v-if="todayRow"><span class="rd-hours__today-label">Hôm nay, {{ todayRow.label }}</span><strong>{{ todayRow.text }}</strong></template>
      </p>
      <details class="rd-hours__week">
        <summary class="rd-hours__summary">Giờ từng ngày</summary>
        <table class="rd-hours__table">
          <caption class="visually-hidden">Giờ mở cửa trong tuần theo giờ Việt Nam</caption>
          <tbody>
            <tr v-for="row in rows" :key="row.day" :aria-current="row.day === today ? 'date' : undefined"><th scope="row">{{ row.label }}</th><td>{{ row.text }}</td></tr>
          </tbody>
        </table>
      </details>
    </template>
    <p v-else class="rd-hours__today">Giờ mở cửa đang cập nhật</p>
    <p class="empty-note rd-hours__note">Giờ Việt Nam (UTC+7). Ngày lễ có thể thay đổi, gọi quán trước khi ghé nhé.</p>
  </section>
</template>

<style scoped>
.rd-hours { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-5); border: var(--border); border-radius: var(--radius-card); background: var(--paper-raised); }
/* Giữ chỗ cho dòng "Hôm nay" hiện ra sau khi hydrate. */
.rd-hours__today { min-height: 24px; margin: var(--space-1) 0 0; display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-1) var(--space-3); font-size: 15px; line-height: 24px; }
.rd-hours__today-label { color: var(--ink-soft); }
.rd-hours__summary { display: flex; align-items: center; min-height: var(--tap-min); font-weight: 600; cursor: pointer; list-style: none; }
.rd-hours__summary::-webkit-details-marker { display: none; }
.rd-hours__summary::after { content: ''; width: 8px; height: 8px; margin-left: var(--space-2); border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-2px) rotate(45deg); transition: transform var(--dur-standard) var(--ease-out); }
.rd-hours__week[open] .rd-hours__summary::after { transform: translateY(2px) rotate(-135deg); }
.rd-hours__week[open] .rd-hours__table { animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-hours__table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5; }
.rd-hours__table th, .rd-hours__table td { padding: var(--space-2); vertical-align: top; border-bottom: var(--border); }
.rd-hours__table th { text-align: left; white-space: nowrap; font-weight: 400; }
.rd-hours__table td { text-align: right; }
/* Dòng hôm nay: đậm và nền nhạt, không chỉ dựa vào màu. */
.rd-hours__table tr[aria-current='date'] { background: var(--mist); font-weight: 700; }
.rd-hours__table tr[aria-current='date'] th { font-weight: 700; }
.rd-hours__note { font-size: 13px; }
</style>
