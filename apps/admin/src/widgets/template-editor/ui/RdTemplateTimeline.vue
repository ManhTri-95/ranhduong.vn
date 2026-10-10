<script setup lang="ts">
import { WEEK_DAYS, type TemplateAnalysis, type TemplateDayInput, type TemplatePlace, type TemplateStopInput } from '@ranhduong/contracts';
import { computed } from 'vue';
const props = defineProps<{ days: TemplateDayInput[]; analysis: TemplateAnalysis; places: TemplatePlace[]; busy: boolean }>();
const emit = defineEmits<{
  start: [day: number, value: string]; stop: [key: string, patch: Partial<TemplateStopInput>]; move: [key: string, day: number, index: number];
  remove: [key: string]; replace: [key: string, placeId: string]; drop: [event: DragEvent, day: number, index: number]; removeDay: [day: number]; addDay: [];
}>();
const placesById = computed(() => new Map(props.places.map((p) => [p.id, p])));
const value = (event: Event) => (event.target as HTMLInputElement).value;
function drag(event: DragEvent, key: string): void {
  if (props.busy) { event.preventDefault(); return; }
  event.dataTransfer?.setData('application/x-rd-itinerary', JSON.stringify({ kind: 'stop', key }));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}
function moveDay(event: Event, key: string): void {
  const target = Number(value(event)); emit('move', key, target, props.days[target]?.stops.length ?? 0);
}
</script>
<template>
  <section class="rd-template-timeline" aria-label="Lịch trình theo ngày">
    <section v-for="(day, d) in days" :key="d" class="rd-admin-section rd-template-timeline__day" :data-day-index="d" @dragover.prevent @drop.prevent.stop="emit('drop', $event, d, day.stops.length)">
      <header class="rd-template-timeline__head"><h2 class="rd-admin-section__title">Ngày {{ d + 1 }} · {{ WEEK_DAYS.find(w => w.day === analysis.days[d]?.weekday)?.label }}</h2><button type="button" class="rd-btn rd-btn--outline" :disabled="busy || days.length === 1" :aria-label="`Bỏ ngày ${d + 1}`" @click="emit('removeDay', d)">Bỏ ngày</button></header>
      <label class="rd-field"><span class="rd-field__label">Giờ bắt đầu ngày {{ d + 1 }}</span><input class="rd-input" type="time" :value="day.startTime" :disabled="busy" @change="emit('start', d, value($event))"></label>
      <p v-if="!day.stops.length" class="rd-callout rd-callout--warn">Kéo địa điểm vào đây hoặc bấm Thêm ở kho.</p>
      <ol class="rd-template-timeline__stops">
        <li v-for="(stop, s) in day.stops" :key="stop.key" class="rd-template-timeline__stop" :data-stop-key="stop.key" :draggable="!busy" @dragstart.stop="drag($event, stop.key)" @dragover.prevent.stop @drop.prevent.stop="emit('drop', $event, d, s)">
          <strong>{{ s + 1 }}. {{ placesById.get(stop.placeId)?.name ?? 'Địa điểm không còn tồn tại' }}</strong>
          <p class="rd-field__hint">{{ analysis.days[d]?.stops[s]?.travelMinFromPrev ?? 0 }} phút di chuyển từ điểm trước · ước lượng</p>
          <div class="rd-template-timeline__times">
            <label class="rd-field"><span class="rd-field__label">Giờ đến</span><input class="rd-input" type="time" :disabled="busy" :value="stop.manualStart ?? analysis.days[d]?.stops[s]?.start" @change="emit('stop', stop.key, { manualStart: value($event) || undefined })"></label>
            <label class="rd-field"><span class="rd-field__label">Giờ đi (HH:mm)</span><input class="rd-input" placeholder="08:00" :disabled="busy" :value="stop.manualEnd ?? analysis.days[d]?.stops[s]?.end" @input="emit('stop', stop.key, { manualEnd: value($event) || undefined })"></label>
            <label class="rd-field"><span class="rd-field__label">Dừng dự kiến (phút)</span><input class="rd-input" type="number" min="1" max="1440" :disabled="busy" :value="stop.durationMin ?? placesById.get(stop.placeId)?.visitDurationMin ?? 60" @change="emit('stop', stop.key, { durationMin: Number(value($event)) || undefined })"></label>
            <label class="rd-field"><span class="rd-field__label">Loại điểm</span><select class="rd-input" :disabled="busy" :value="stop.kind" @change="emit('stop', stop.key, { kind: value($event) === 'meal' ? 'meal' : 'visit' })"><option value="visit">Ghé thăm</option><option value="meal">Bữa ăn</option></select></label>
          </div>
          <div v-if="stop.manualStart || stop.manualEnd" class="rd-template-timeline__actions"><span class="rd-status rd-status--warn">Đã sửa tay</span><button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="emit('stop', stop.key, { manualStart: undefined, manualEnd: undefined })">Tính lại tự động</button></div>
          <label class="rd-field"><span class="rd-field__label">Ghi chú điểm dừng</span><textarea class="rd-input" :value="stop.note" rows="2" maxlength="2000" :disabled="busy" @input="emit('stop', stop.key, { note: value($event) })" /></label>
          <details><summary class="rd-template-timeline__summary">Đổi địa điểm hoặc chuyển ngày</summary>
            <label class="rd-field"><span class="rd-field__label">Địa điểm</span><select class="rd-input" :value="stop.placeId" :disabled="busy" @change="emit('replace', stop.key, value($event))"><option v-if="!placesById.has(stop.placeId)" :value="stop.placeId">Địa điểm không còn tồn tại</option><option v-for="place in places" :key="place.id" :value="place.id" :disabled="!['active', 'draft'].includes(place.status)">{{ place.name }}</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Chuyển sang ngày</span><select class="rd-input" :value="d" :disabled="busy" @change="moveDay($event, stop.key)"><option v-for="(_, i) in days" :key="i" :value="i">Ngày {{ i + 1 }}</option></select></label>
          </details>
          <div class="rd-template-timeline__actions">
            <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === 0" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} lên`" @click="emit('move', stop.key, d, s - 1)">↑ Lên</button>
            <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === day.stops.length - 1" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} xuống`" @click="emit('move', stop.key, d, s + 2)">↓ Xuống</button>
            <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" :aria-label="`Bỏ điểm ${s + 1} ngày ${d + 1}`" @click="emit('remove', stop.key)">Bỏ</button>
          </div>
          <p v-for="issue in analysis.issues.filter(i => i.stopKey === stop.key)" :key="issue.code" :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']">{{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}</p>
        </li>
      </ol>
      <p v-for="(issue, index) in analysis.issues.filter(i => i.day === d && !i.stopKey)" :key="`${issue.code}-${index}`" :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']">{{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}</p>
      <div class="rd-template-timeline__drop" @dragover.prevent.stop @drop.prevent.stop="emit('drop', $event, d, day.stops.length)">Thả địa điểm vào cuối ngày {{ d + 1 }}</div>
    </section>
    <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || days.length >= 5" @click="emit('addDay')">+ Thêm ngày ({{ days.length }}/5)</button>
  </section>
</template>
<style scoped>
.rd-template-timeline { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-timeline__day { min-width: 0; }
.rd-template-timeline__head, .rd-template-timeline__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); justify-content: space-between; }
.rd-template-timeline__stops { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
.rd-template-timeline__stop { display: flex; flex-direction: column; gap: var(--space-3); border: var(--border); border-radius: var(--radius-chip); padding: var(--space-3); background: var(--paper); min-width: 0; overflow-wrap: anywhere; }
.rd-template-timeline__times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-timeline__actions { justify-content: flex-start; }
.rd-template-timeline__actions .rd-btn { min-height: var(--tap-min); padding: 0 var(--space-3); }
.rd-template-timeline__summary { cursor: pointer; min-height: var(--tap-min); display: flex; align-items: center; font-weight: 600; }
.rd-template-timeline__drop { padding: var(--space-4); border: var(--border-hair) dashed var(--ink-soft); border-radius: var(--radius-chip); color: var(--ink-soft); font-size: 13px; }
details { display: flex; flex-direction: column; gap: var(--space-3); }
</style>
