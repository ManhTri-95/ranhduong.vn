<script setup lang="ts">
import { formatOpeningHours, OpeningHoursParseError, openingHoursIssues, parseOpeningHours, WEEK_DAYS } from '@ranhduong/contracts';
import { computed, ref } from 'vue';
import { addShift, removeShift, setDayKind, slotsFromWeek, updateShift, weekFromSlots, type DayHours, type WeekHours } from '../lib/week';

const props = defineProps<{ modelValue: WeekHours; error?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: WeekHours] }>();

const KINDS: DayHours['kind'][] = ['closed', 'allDay', 'shifts'];
const KIND_LABEL: Record<DayHours['kind'], string> = { closed: 'Đóng', allDay: 'Mở cả ngày', shifts: 'Theo ca' };

const pasted = ref('');
const pasteError = ref<string | null>(null);
const pasteDone = ref(false);

const slots = computed(() => slotsFromWeek(props.modelValue));
/** Chỉ báo lỗi khi đã nhập ít nhất một ca; chưa nhập gì thì danh sách điều kiện kích hoạt đã nhắc. */
const issues = computed(() => (slots.value.length === 0 ? [] : openingHoursIssues(slots.value)));
const sheetText = computed(() => (slots.value.length > 0 && issues.value.length === 0 ? formatOpeningHours(slots.value) : ''));

const dayHours = (day: number): DayHours => props.modelValue[day] ?? { kind: 'closed' };
const shiftsOf = (day: number) => {
  const hours = dayHours(day);
  return hours.kind === 'shifts' ? hours.shifts : [];
};
const valueOf = (event: Event) => (event.target instanceof HTMLInputElement ? event.target.value : '');
const update = (week: WeekHours) => emit('update:modelValue', week);

function applyPaste(): void {
  pasteDone.value = false;
  if (!pasted.value.trim()) {
    pasteError.value = 'Dán giờ theo mẫu, ví dụ T2-T6 07:00-22:00; T7-CN 06:30-23:00';
    return;
  }
  try {
    update(weekFromSlots(parseOpeningHours(pasted.value)));
    pasteError.value = null;
    pasteDone.value = true;
  } catch (err) {
    if (!(err instanceof OpeningHoursParseError)) throw err;
    pasteError.value = err.message;
  }
}
</script>

<template>
  <div class="hours">
    <div class="rd-field">
      <label class="rd-field__label" for="hours-paste">Dán giờ từ Google Sheet</label>
      <div class="paste">
        <input
          id="hours-paste"
          v-model="pasted"
          class="rd-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="T2-T6 07:00-22:00; T7-CN 06:30-23:00"
          aria-describedby="hours-paste-hint"
          @keydown.enter.prevent="applyPaste"
        />
        <button type="button" class="rd-btn rd-btn--outline" @click="applyPaste">Điền vào bảng</button>
      </div>
      <p id="hours-paste-hint" class="rd-field__hint">
        Nghỉ ghi "T2 Đóng", mở cả ngày ghi "T2-CN 24h", nhiều ca cách nhau dấu phẩy. Điền vào bảng sẽ thay giờ cả tuần.
      </p>
      <p v-if="pasteError" class="rd-field__error" role="alert">{{ pasteError }}</p>
      <p v-else-if="pasteDone" class="rd-field__hint" role="status">Đã điền giờ cả tuần, xem lại bảng bên dưới.</p>
    </div>

    <fieldset v-for="{ day, label } in WEEK_DAYS" :key="day" class="day">
      <legend class="day__label">{{ label }}</legend>
      <div class="rd-choices">
        <label v-for="kind in KINDS" :key="kind" class="rd-choice">
          <input type="radio" :name="`hours-${day}`" :value="kind" :checked="dayHours(day).kind === kind" @change="update(setDayKind(modelValue, day, kind))" />
          {{ KIND_LABEL[kind] }}
        </label>
      </div>
      <div v-for="(shift, index) in shiftsOf(day)" :key="index" class="shift">
        <label class="shift__field">
          Mở
          <input
            class="rd-input"
            type="time"
            :value="shift.open"
            :aria-invalid="shift.open === ''"
            @change="update(updateShift(modelValue, day, index, { open: valueOf($event) }))"
          />
        </label>
        <label class="shift__field">
          Đóng
          <input
            class="rd-input"
            type="time"
            :value="shift.close"
            :aria-invalid="shift.close === ''"
            @change="update(updateShift(modelValue, day, index, { close: valueOf($event) }))"
          />
        </label>
        <button type="button" class="rd-icon-btn" :aria-label="`Xoá ca ${index + 1} ngày ${label}`" @click="update(removeShift(modelValue, day, index))">
          ×
        </button>
      </div>
      <button v-if="dayHours(day).kind === 'shifts'" type="button" class="rd-btn rd-btn--outline add" @click="update(addShift(modelValue, day))">
        Thêm ca
      </button>
    </fieldset>

    <p v-if="sheetText" class="rd-quiet">Dạng Sheet: {{ sheetText }}</p>
    <div v-if="issues.length > 0 || error" class="rd-callout rd-callout--bad" role="alert">
      <p v-if="error" class="issue">{{ error }}</p>
      <p v-for="issue in issues" :key="issue" class="issue">{{ issue }}</p>
    </div>
  </div>
</template>

<style scoped>
.hours { display: flex; flex-direction: column; gap: var(--space-4); }
.paste { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.paste .rd-input { flex: 1 1 200px; }
.day { margin: 0; padding: var(--space-3) 0 0; border: 0; border-top: var(--border); display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.day__label { padding: 0; font: 700 14px/20px var(--font-body); }
.shift { display: grid; grid-template-columns: 1fr 1fr var(--tap-min); gap: var(--space-2); align-items: end; }
.shift__field { display: flex; flex-direction: column; gap: 4px; font: 600 13px/18px var(--font-body); min-width: 0; }
.add { align-self: flex-start; }
.issue { margin: 0; }
</style>
