<script setup lang="ts">
import { CATEGORY_LABEL, WEEK_DAYS, type TemplateAnalysis, type TemplateDayInput, type TemplatePlace, type TemplateStopInput } from '@ranhduong/contracts';
import { computed, nextTick, ref } from 'vue';
import { moveAnnouncement, stopRow } from '../model/summary';

const props = defineProps<{ days: TemplateDayInput[]; analysis: TemplateAnalysis; places: TemplatePlace[]; busy: boolean; expandedKey: string | null }>();
const emit = defineEmits<{
  start: [day: number, value: string];
  stop: [key: string, patch: Partial<TemplateStopInput>];
  move: [key: string, day: number, index: number];
  remove: [key: string];
  replace: [key: string, placeId: string];
  drop: [event: DragEvent, day: number, index: number];
  removeDay: [day: number];
  addDay: [];
  expand: [key: string | null];
}>();

const placesById = computed(() => new Map(props.places.map((p) => [p.id, p])));
const value = (event: Event) => (event.target as HTMLInputElement).value;
const nameOf = (placeId: string) => placesById.value.get(placeId)?.name ?? 'Địa điểm không còn tồn tại';
const categoryOf = (placeId: string) => {
  const place = placesById.value.get(placeId);
  return place ? CATEGORY_LABEL[place.category] : '';
};
const durationOf = (stop: TemplateStopInput) => stop.durationMin ?? placesById.value.get(stop.placeId)?.visitDurationMin ?? 60;
const scheduled = (day: number, key: string) => props.analysis.days[day]?.stops.find((stop) => stop.key === key);
const rows = computed(() => new Map(props.days.flatMap((day, d) => day.stops.map((stop) => [stop.key, stopRow(stop, scheduled(d, stop.key), props.analysis.issues)] as const))));

/** Câu báo cho trình đọc màn hình sau khi đổi chỗ, bỏ điểm. */
const announcement = ref('');

function drag(event: DragEvent, key: string): void {
  if (props.busy) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData('application/x-rd-itinerary', JSON.stringify({ kind: 'stop', key }));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

/** Sau khi đổi chỗ: báo vị trí mới và giữ focus trên đúng nút của điểm đó (nút bị tắt ở mép thì về nút mở hàng). */
async function afterMove(key: string, focus: 'up' | 'down' | 'toggle'): Promise<void> {
  await nextTick();
  const stop = props.days.flatMap((day) => day.stops).find((s) => s.key === key);
  announcement.value = stop ? moveAnnouncement(props.days, key, nameOf(stop.placeId)) : '';
  const button = document.querySelector<HTMLButtonElement>(`[data-stop-${focus}="${key}"]`);
  const target = button && !button.disabled ? button : document.querySelector<HTMLElement>(`[data-stop-toggle="${key}"]`);
  target?.focus();
}
function moveBy(key: string, day: number, index: number, delta: -1 | 1): void {
  emit('move', key, day, delta < 0 ? index - 1 : index + 2);
  void afterMove(key, delta < 0 ? 'up' : 'down');
}
function moveDay(event: Event, key: string): void {
  const target = Number(value(event));
  emit('move', key, target, props.days[target]?.stops.length ?? 0);
  void afterMove(key, 'toggle');
}
async function removeStop(key: string, day: number, placeId: string): Promise<void> {
  emit('remove', key);
  announcement.value = `Đã bỏ ${nameOf(placeId)} khỏi ngày ${day + 1}.`;
  await nextTick();
  document.querySelector<HTMLElement>(`[data-day-title="${day}"]`)?.focus();
}
</script>

<template>
  <section class="rd-template-timeline" aria-label="Lịch trình theo ngày">
    <p class="rd-sr-only" aria-live="polite">{{ announcement }}</p>
    <section
      v-for="(day, d) in days"
      :key="d"
      class="rd-admin-section rd-template-timeline__day"
      :data-day-index="d"
      @dragover.prevent
      @drop.prevent.stop="emit('drop', $event, d, day.stops.length)"
    >
      <header class="rd-template-timeline__head">
        <h2 class="rd-admin-section__title" tabindex="-1" :data-day-title="d">Ngày {{ d + 1 }} · {{ WEEK_DAYS.find((w) => w.day === analysis.days[d]?.weekday)?.label }}</h2>
        <label class="rd-template-timeline__start">
          <span>Bắt đầu</span>
          <input class="rd-input" type="time" :value="day.startTime" :disabled="busy" :aria-label="`Giờ bắt đầu ngày ${d + 1}`" @change="emit('start', d, value($event))" />
        </label>
        <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy || days.length === 1" @click="emit('removeDay', d)">Bỏ ngày {{ d + 1 }}</button>
      </header>
      <p
        v-for="(issue, index) in analysis.issues.filter((i) => i.day === d && !i.stopKey)"
        :key="`${issue.code}-${index}`"
        :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']"
      >
        {{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}
      </p>
      <p v-if="!day.stops.length" class="rd-callout rd-callout--warn">Kéo địa điểm vào đây hoặc bấm Thêm ở kho.</p>
      <ol class="rd-template-timeline__stops">
        <li
          v-for="(stop, s) in day.stops"
          :key="stop.key"
          :class="['rd-stop-row', { 'is-open': expandedKey === stop.key }]"
          :data-stop-key="stop.key"
          :draggable="!busy && expandedKey !== stop.key"
          @dragstart.stop="drag($event, stop.key)"
          @dragover.prevent.stop
          @drop.prevent.stop="emit('drop', $event, d, s)"
        >
          <p v-if="s > 0" class="rd-stop-row__travel">{{ scheduled(d, stop.key)?.travelMinFromPrev ?? 0 }} phút di chuyển từ điểm trước (ước lượng)</p>
          <div class="rd-stop-row__head">
            <span class="rd-stop-row__num" aria-hidden="true">{{ s + 1 }}</span>
            <button
              type="button"
              class="rd-stop-row__toggle"
              :aria-expanded="expandedKey === stop.key"
              :aria-controls="`stop-body-${stop.key}`"
              :data-stop-toggle="stop.key"
              @click="emit('expand', expandedKey === stop.key ? null : stop.key)"
            >
              <span class="rd-stop-row__time">{{ rows.get(stop.key)?.time }}</span>
              <span class="rd-stop-row__name"><span class="rd-sr-only">Điểm {{ s + 1 }}: </span>{{ nameOf(stop.placeId) }}</span>
              <span class="rd-stop-row__meta">
                {{ categoryOf(stop.placeId) }} · {{ durationOf(stop) }} phút<template v-if="stop.kind === 'meal'"> · Bữa ăn</template><template v-if="rows.get(stop.key)?.manual"> · đã sửa tay</template>
              </span>
            </button>
            <span v-if="rows.get(stop.key)?.errors" class="rd-status rd-status--bad">✕ {{ rows.get(stop.key)?.errors }}<span class="rd-sr-only"> lỗi</span></span>
            <span v-if="rows.get(stop.key)?.warnings" class="rd-status rd-status--warn">⚠ {{ rows.get(stop.key)?.warnings }}<span class="rd-sr-only"> nhắc</span></span>
          </div>
          <div v-if="expandedKey === stop.key" :id="`stop-body-${stop.key}`" class="rd-stop-row__body">
            <div class="rd-template-timeline__times">
              <label class="rd-field"><span class="rd-field__label">Giờ đến</span><input class="rd-input" type="time" :disabled="busy" :value="stop.manualStart ?? scheduled(d, stop.key)?.start" @change="emit('stop', stop.key, { manualStart: value($event) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Giờ đi (HH:mm)</span><input class="rd-input" placeholder="08:00" :disabled="busy" :value="stop.manualEnd ?? scheduled(d, stop.key)?.end" @input="emit('stop', stop.key, { manualEnd: value($event) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Dừng dự kiến (phút)</span><input class="rd-input" type="number" min="1" max="1440" :disabled="busy" :value="durationOf(stop)" @change="emit('stop', stop.key, { durationMin: Number(value($event)) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Loại điểm</span><select class="rd-input" :disabled="busy" :value="stop.kind" @change="emit('stop', stop.key, { kind: value($event) === 'meal' ? 'meal' : 'visit' })"><option value="visit">Ghé thăm</option><option value="meal">Bữa ăn</option></select></label>
            </div>
            <div v-if="stop.manualStart || stop.manualEnd" class="rd-template-timeline__actions">
              <span class="rd-status rd-status--warn">Đã sửa tay</span>
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="emit('stop', stop.key, { manualStart: undefined, manualEnd: undefined })">Tính lại tự động</button>
            </div>
            <label class="rd-field"><span class="rd-field__label">Ghi chú điểm dừng</span><textarea class="rd-input" :value="stop.note" rows="2" maxlength="2000" :disabled="busy" @input="emit('stop', stop.key, { note: value($event) })"></textarea></label>
            <div class="rd-template-timeline__times">
              <label class="rd-field">
                <span class="rd-field__label">Đổi địa điểm</span>
                <select class="rd-input" :value="stop.placeId" :disabled="busy" @change="emit('replace', stop.key, value($event))">
                  <option v-if="!placesById.has(stop.placeId)" :value="stop.placeId">Địa điểm không còn tồn tại</option>
                  <option v-for="place in places" :key="place.id" :value="place.id" :disabled="!['active', 'draft'].includes(place.status)">{{ place.name }}</option>
                </select>
              </label>
              <label class="rd-field">
                <span class="rd-field__label">Chuyển sang ngày</span>
                <select class="rd-input" :value="d" :disabled="busy" @change="moveDay($event, stop.key)">
                  <option v-for="(_, i) in days" :key="i" :value="i">Ngày {{ i + 1 }}</option>
                </select>
              </label>
            </div>
            <div class="rd-template-timeline__actions">
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === 0" :data-stop-up="stop.key" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} lên`" @click="moveBy(stop.key, d, s, -1)">↑ Lên</button>
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === day.stops.length - 1" :data-stop-down="stop.key" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} xuống`" @click="moveBy(stop.key, d, s, 1)">↓ Xuống</button>
              <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy" :aria-label="`Bỏ điểm ${s + 1} ngày ${d + 1}`" @click="removeStop(stop.key, d, stop.placeId)">Bỏ điểm</button>
            </div>
            <p
              v-for="issue in analysis.issues.filter((i) => i.stopKey === stop.key)"
              :key="issue.code"
              :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']"
            >
              {{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}
            </p>
          </div>
        </li>
      </ol>
      <div class="rd-template-timeline__drop" @dragover.prevent.stop @drop.prevent.stop="emit('drop', $event, d, day.stops.length)">Thả địa điểm vào cuối ngày {{ d + 1 }}</div>
    </section>
    <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || days.length >= 5" @click="emit('addDay')">+ Thêm ngày ({{ days.length }}/5)</button>
  </section>
</template>

<style scoped>
.rd-template-timeline { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-timeline__day { min-width: 0; }
.rd-template-timeline__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rd-template-timeline__head h2 { flex: 1 1 auto; }
.rd-template-timeline__head h2:focus { outline: none; }
.rd-template-timeline__start { display: inline-flex; align-items: center; gap: var(--space-2); font-weight: 600; }
.rd-template-timeline__start .rd-input { width: auto; }
.rd-template-timeline__stops { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.rd-stop-row { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; padding: var(--space-2) var(--space-3); border: var(--border); border-radius: var(--radius-chip); background: var(--paper); overflow-wrap: anywhere; transition: border-color var(--dur-micro) var(--ease-out); }
.rd-stop-row[draggable='true'] { cursor: grab; }
.rd-stop-row.is-open { border: var(--border-strong) solid var(--ink); background: var(--paper-raised); }
.rd-stop-row__travel { margin: 0; font: italic 400 12px/16px var(--font-body); color: var(--ink-soft); }
.rd-stop-row__head { display: flex; align-items: center; gap: var(--space-2); }
.rd-stop-row__num { flex: 0 0 28px; height: 28px; border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); display: flex; align-items: center; justify-content: center; font: 700 13px var(--font-body); }
.rd-stop-row__toggle { flex: 1 1 auto; min-width: 0; min-height: var(--tap-min); display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: var(--space-3); align-items: center; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.rd-stop-row__time { grid-row: 1 / span 2; font: 700 13px/18px var(--font-body); font-variant-numeric: tabular-nums; color: var(--ink-soft); }
.rd-stop-row__name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-stop-row__meta { font-size: 13px; color: var(--ink-soft); }
.rd-stop-row__body { display: flex; flex-direction: column; gap: var(--space-3); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-template-timeline__times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-timeline__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.rd-template-timeline__drop { padding: var(--space-4); border: var(--border-hair) dashed var(--ink-soft); border-radius: var(--radius-chip); color: var(--ink-soft); font-size: 13px; }
</style>
