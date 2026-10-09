<script setup lang="ts">
import { openStatus, type PlaceDetail } from '@ranhduong/contracts';
import { computed } from 'vue';
import { openingHoursRows } from '../lib/place-detail';
import { openStatusText } from '../lib/open-status-text';

const props = defineProps<{ place: PlaceDetail; now: Date | null }>();
const rows = computed(() => openingHoursRows(props.place.openingHours));
const status = computed(() => props.now ? openStatusText(openStatus(props.place.openingHours, props.now)) : {});
</script>

<template>
  <section class="rd-hours" aria-labelledby="opening-hours-title">
    <h2 id="opening-hours-title" class="section-title">Giờ mở cửa</h2>
    <p class="rd-hours__status" role="status" aria-live="polite">
      <strong v-if="place.status === 'closed'">Đã đóng cửa</strong>
      <template v-else>
        <span v-if="status.chip" class="rd-chip rd-chip--accent">{{ status.chip }}</span>
        <span v-if="status.text">{{ status.text }}</span>
        <span v-else-if="!status.chip">{{ rows.length ? 'Giờ mở cửa theo giờ Việt Nam' : 'Giờ mở cửa đang cập nhật' }}</span>
      </template>
    </p>
    <table v-if="rows.length" class="rd-hours__table">
      <caption class="visually-hidden">Giờ mở cửa trong tuần theo giờ Việt Nam</caption>
      <tbody>
        <tr v-for="row in rows" :key="row.day"><th scope="row">{{ row.label }}</th><td>{{ row.text }}</td></tr>
      </tbody>
    </table>
    <p class="empty-note">Giờ Việt Nam (UTC+7). Ngày lễ có thể thay đổi, gọi quán trước khi ghé nhé.</p>
  </section>
</template>

<style scoped>
.rd-hours { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); border: var(--border); border-radius: var(--radius-card); background: var(--paper-raised); }
.rd-hours__status { min-height: var(--tap-min); display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin: 0; }
.rd-hours__table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5; }
.rd-hours__table th, .rd-hours__table td { padding: var(--space-2) 0; vertical-align: top; border-bottom: var(--border); }
.rd-hours__table th { text-align: left; white-space: nowrap; padding-right: var(--space-4); }
.rd-hours__table td { text-align: right; }
</style>
