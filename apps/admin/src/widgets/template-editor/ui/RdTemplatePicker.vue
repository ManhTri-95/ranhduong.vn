<script setup lang="ts">
import { CATEGORY_LABEL, PLACE_STATUS_LABEL, PlaceCategory, type TemplateDayInput, type TemplatePlace } from '@ranhduong/contracts';
import { searchKey } from '@ranhduong/geo';
import { computed, ref, watch } from 'vue';
const props = defineProps<{ places: TemplatePlace[]; days: TemplateDayInput[]; busy: boolean }>();
const emit = defineEmits<{ add: [day: number, placeId: string] }>();
const query = ref(''); const category = ref(''); const zone = ref(''); const day = ref(0);
watch(() => props.days.length, (length) => { if (day.value >= length) day.value = length - 1; });
const zones = computed(() => [...new Set(props.places.flatMap((p) => p.zoneName ?? []))]);
const candidates = computed(() => props.places.filter((p) => p.status !== 'merged' && searchKey(p.name).includes(searchKey(query.value)) && (!category.value || [p.category, ...p.alsoCategories].includes(category.value as TemplatePlace['category'])) && (!zone.value || p.zoneName === zone.value)));
function drag(event: DragEvent, place: TemplatePlace): void {
  if (props.busy || !['active', 'draft'].includes(place.status)) { event.preventDefault(); return; }
  event.dataTransfer?.setData('application/x-rd-itinerary', JSON.stringify({ kind: 'place', placeId: place.id }));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
}
</script>
<template>
  <section class="rd-admin-section rd-template-picker" aria-labelledby="template-library">
    <h2 id="template-library" class="rd-admin-section__title">Kho địa điểm</h2>
    <p class="rd-field__hint">Kéo vào ngày hoặc dùng nút Thêm. Nháp có nhắc nhở; chỗ đang ẩn, bị nghi ngờ hoặc đã đóng không dùng được.</p>
    <label class="rd-field"><span class="rd-field__label">Tìm địa điểm</span><input v-model="query" class="rd-input" type="search" placeholder="Tên có dấu hoặc không dấu" :disabled="busy"></label>
    <div class="rd-template-picker__filters">
      <label class="rd-field"><span class="rd-field__label">Danh mục</span><select v-model="category" class="rd-input" :disabled="busy"><option value="">Tất cả</option><option v-for="value in PlaceCategory.options" :key="value" :value="value">{{ CATEGORY_LABEL[value] }}</option></select></label>
      <label class="rd-field"><span class="rd-field__label">Khu vực</span><select v-model="zone" class="rd-input" :disabled="busy"><option value="">Tất cả</option><option v-for="value in zones" :key="value" :value="value">{{ value }}</option></select></label>
    </div>
    <label class="rd-field"><span class="rd-field__label">Thêm vào ngày</span><select v-model.number="day" class="rd-input" :disabled="busy"><option v-for="(_, index) in days" :key="index" :value="index">Ngày {{ index + 1 }}</option></select></label>
    <p class="rd-field__hint" aria-live="polite">{{ candidates.length }} địa điểm</p>
    <ul class="rd-template-picker__places">
      <li v-for="place in candidates" :key="place.id" class="rd-template-picker__place" :draggable="!busy && ['active', 'draft'].includes(place.status)" :data-place-id="place.id" @dragstart="drag($event, place)">
        <strong>{{ place.name }}</strong><span class="rd-field__hint">{{ CATEGORY_LABEL[place.category] }} · {{ PLACE_STATUS_LABEL[place.status] }}</span>
        <span class="rd-field__hint">Dừng dự kiến {{ place.visitDurationMin ?? 60 }} phút</span>
        <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || !['active', 'draft'].includes(place.status) || (days[day]?.stops.length ?? 20) >= 20" :aria-label="`Thêm ${place.name} vào ngày ${day + 1}`" @click="emit('add', day, place.id)">Thêm</button>
      </li>
    </ul>
    <p v-if="!candidates.length" class="rd-field__hint">Chưa có chỗ khớp bộ lọc.</p>
  </section>
</template>
<style scoped>
.rd-template-picker { min-width: 0; align-self: start; }
.rd-template-picker__filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
.rd-template-picker__places { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); max-height: 650px; overflow-y: auto; }
.rd-template-picker__place { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border: var(--border); border-radius: var(--radius-chip); background: var(--paper); overflow-wrap: anywhere; }
.rd-template-picker__place[draggable='true'] { cursor: grab; }
</style>
