<script setup lang="ts">
import { computed } from 'vue';
import { formatCount, type DayColumn } from '../model/report';

const props = defineProps<{ columns: DayColumn[] }>();
const noClicks = computed(() => props.columns.every((column) => column.state === 'future' || column.counts.directionClicks === 0));
const dayName = (column: DayColumn) => `${column.weekday} ${column.date}${column.state === 'today' ? ' (hôm nay, đang đếm)' : ''}`;
/** Câu đầy đủ của một ngày: hiện khi rê chuột hoặc focus vào cột, trình đọc màn hình luôn đọc. */
function detail(column: DayColumn): string {
  if (column.state === 'future') return `${dayName(column)}: chưa tới`;
  const { directionClicks, views, calls, fanpageClicks } = column.counts;
  return `${dayName(column)}: ${formatCount(directionClicks)} chỉ đường · ${formatCount(views)} lượt xem · ${formatCount(calls)} gọi quán · ${formatCount(fanpageClicks)} fanpage`;
}
</script>

<template>
  <section class="rd-admin-section" aria-labelledby="metrics-days-title">
    <h2 id="metrics-days-title" class="rd-admin-section__title">Chỉ đường theo ngày</h2>
    <p v-if="noClicks" class="rd-quiet">Tuần này chưa có lượt bấm chỉ đường nào.</p>
    <ol class="rd-metrics-chart">
      <li v-for="column in columns" :key="column.dayKey" :class="['rd-metrics-chart__col', `is-${column.state}`]" tabindex="0">
        <span class="rd-metrics-chart__track" aria-hidden="true">
          <span class="rd-metrics-chart__value">{{ column.state === 'future' ? '—' : formatCount(column.counts.directionClicks) }}</span>
          <span v-if="column.heightPct > 0" class="rd-metrics-chart__bar" :style="{ '--bar-pct': column.heightPct }"></span>
        </span>
        <span class="rd-metrics-chart__day" aria-hidden="true"><strong>{{ column.weekday }}</strong>{{ column.state === 'today' ? 'Hôm nay' : column.date }}</span>
        <span class="rd-metrics-chart__tip">{{ detail(column) }}</span>
      </li>
    </ol>
    <details class="rd-metrics-days">
      <summary>Xem số theo ngày</summary>
      <table class="rd-admin-table">
        <caption class="rd-sr-only">Số liệu từng ngày trong tuần</caption>
        <thead><tr><th scope="col">Ngày</th><th scope="col">Chỉ đường</th><th scope="col">Lượt xem</th><th scope="col">Gọi quán</th><th scope="col">Fanpage</th></tr></thead>
        <tbody>
          <tr v-for="column in columns" :key="column.dayKey">
            <th scope="row">{{ dayName(column) }}</th>
            <template v-if="column.state === 'future'"><td colspan="4">Chưa tới</td></template>
            <template v-else>
              <td>{{ formatCount(column.counts.directionClicks) }}</td><td>{{ formatCount(column.counts.views) }}</td>
              <td>{{ formatCount(column.counts.calls) }}</td><td>{{ formatCount(column.counts.fanpageClicks) }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </details>
  </section>
</template>

<style scoped>
.rd-metrics-chart { --chart-h: 160px; position: relative; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--space-1); margin: 0; padding: var(--space-2) 0 0; list-style: none; }
.rd-metrics-chart__col { position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-1) 0; border-radius: var(--radius-chip); cursor: default; }
.rd-metrics-chart__col:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
.rd-metrics-chart__value { font: 700 15px/20px var(--font-body); font-variant-numeric: tabular-nums; }
/* Vùng cột cao --chart-h, đáy là đường nền; số nằm ngay trên đầu thanh; thanh mảnh, bo 4px ở đầu (dataviz: thanh gắn đáy, đầu bo). */
.rd-metrics-chart__track { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: var(--space-1); width: 100%; height: var(--chart-h); border-bottom: var(--border-hair) solid var(--line); }
.rd-metrics-chart__bar { width: min(60%, 48px); height: calc((var(--chart-h) - 24px) * var(--bar-pct) / 100); min-height: 2px; border-radius: 4px 4px 0 0; background: var(--ink); }
/* Hôm nay chưa trọn ngày: thanh sọc chéo có viền, không chỉ khác màu. */
.is-today .rd-metrics-chart__bar { box-sizing: border-box; border: var(--border-hair) solid var(--ink); border-bottom: 0; background: repeating-linear-gradient(135deg, var(--ink) 0 3px, var(--paper-raised) 3px 7px); }
.is-future .rd-metrics-chart__value, .is-future .rd-metrics-chart__day { color: var(--ink-soft); }
.rd-metrics-chart__day { display: flex; flex-direction: column; align-items: center; font-size: 12px; line-height: 16px; color: var(--ink-soft); text-align: center; }
.rd-metrics-chart__day strong { font-size: 13px; color: var(--ink); }
.is-today .rd-metrics-chart__day { color: var(--ink); font-weight: 600; }
/* Chú thích ẩn khỏi mắt nhưng trình đọc màn hình vẫn đọc; hiện khi rê chuột hoặc focus. */
.rd-metrics-chart__tip { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.rd-metrics-chart__col:is(:hover, :focus-visible) .rd-metrics-chart__tip {
  z-index: 1; bottom: calc(100% + var(--space-1)); left: 50%; translate: -50% 0; width: max-content; max-width: 240px; height: auto; overflow: visible; clip-path: none; white-space: normal;
  padding: var(--space-2) var(--space-3); background: var(--ink); color: var(--paper-raised); border-radius: var(--radius-chip); box-shadow: var(--shadow-float); font-size: 13px; line-height: 18px;
}
.rd-metrics-chart__col:first-child:is(:hover, :focus-visible) .rd-metrics-chart__tip { left: 0; translate: 0 0; }
.rd-metrics-chart__col:last-child:is(:hover, :focus-visible) .rd-metrics-chart__tip { left: auto; right: 0; translate: 0 0; }
@media (hover: hover) { .rd-metrics-chart__col:hover { background: var(--paper); } }
.rd-metrics-days summary { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); font-weight: 600; cursor: pointer; }
.rd-metrics-days summary::before { content: '▸'; }
.rd-metrics-days[open] summary::before { content: '▾'; }
.rd-metrics-days table { margin-top: var(--space-2); }
/* Tiêu đề hàng không dính như tiêu đề cột của bảng admin. */
.rd-metrics-days th[scope='row'] { position: static; padding: var(--space-2) 12px; border-bottom: var(--border-hair) solid var(--mist); background: none; color: var(--ink); font-size: 14px; font-weight: 600; }
.rd-metrics-days tbody tr:last-child th { border-bottom: 0; }
.rd-metrics-days td { font-variant-numeric: tabular-nums; }
</style>
