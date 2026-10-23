<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, tagLabel, type CityPublic, type PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mapFilterQuery, parseMapFilters, type MapFilters } from '~/entities/place/lib/map-query';
import RdCompass from '~/shared/ui/RdCompass.vue';

const props = defineProps<{ city: CityPublic; filters: MapFilters; tags: PlaceListResponse['tags'] }>();
const emit = defineEmits<{ filters: [value: MapFilters]; editing: [value: boolean] }>();
const text = ref(props.filters.q ?? '');
const input = ref<HTMLInputElement>();
const advanced = ref<HTMLDetailsElement>();
const advancedToggle = ref<HTMLElement>();
const draftZone = ref(props.filters.zone ?? '');
const draftTags = ref<string[]>([...(props.filters.tags ?? [])]);
const filterCount = computed(() => (props.filters.tags?.length ?? 0) + Number(Boolean(props.filters.zone)));
const activeCount = computed(() => filterCount.value + Number(Boolean(props.filters.category)) + Number(props.filters.rainSafe) + Number(Boolean(props.filters.q)));
const tagOptions = computed(() => [...new Set([...props.tags.map(tag => tag.slug), ...(props.filters.tags ?? [])])]);
const query = computed(() => mapFilterQuery(props.filters.category, props.filters.rainSafe, props.filters));
const hidden = (except: string) => Object.entries(query.value).filter(([key]) => key !== except);
let composing = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function search(blur = false): void {
  clearTimeout(timer);
  if (composing) return;
  const next = parseMapFilters({ ...query.value, q: text.value });
  if (next.q !== props.filters.q) emit('filters', next);
  if (blur) input.value?.blur();
}
function onInput(event: Event): void {
  text.value = (event.target as HTMLInputElement).value;
  clearTimeout(timer);
  if (!composing) timer = setTimeout(search, 350);
}
function onCompositionEnd(event: CompositionEvent): void { composing = false; onInput(event); }
function onCompositionStart(): void { composing = true; clearTimeout(timer); }
function submitSearch(event: SubmitEvent): void { event.preventDefault(); search(true); }
function selectCategory(event: SubmitEvent): void {
  event.preventDefault(); clearTimeout(timer);
  const button = event.submitter;
  if (!(button instanceof HTMLButtonElement)) return;
  emit('filters', parseMapFilters({ ...query.value, q: text.value, category: button.value }));
}
function toggleRain(): void {
  clearTimeout(timer);
  emit('filters', parseMapFilters({ ...query.value, q: text.value, rainSafe: props.filters.rainSafe ? undefined : 'true' }));
}
async function applyFilters(event: SubmitEvent): Promise<void> {
  event.preventDefault(); clearTimeout(timer);
  const moveFocus = advanced.value?.contains(document.activeElement);
  emit('filters', parseMapFilters({ ...query.value, q: text.value, zone: draftZone.value, tags: draftTags.value }));
  if (advanced.value) advanced.value.open = false;
  await nextTick();
  if (moveFocus) advancedToggle.value?.focus();
}
function reset(): void { clearTimeout(timer); if (advanced.value) advanced.value.open = false; advancedToggle.value?.focus(); emit('filters', { rainSafe: false, tags: [] }); }
function dismiss(event: PointerEvent): void { if (advanced.value?.open && event.target instanceof Node && !advanced.value.contains(event.target)) advanced.value.open = false; }
function escape(event: KeyboardEvent): void { if (event.key === 'Escape' && advanced.value?.open) { advanced.value.open = false; advancedToggle.value?.focus(); } }
watch(() => JSON.stringify(query.value), () => { clearTimeout(timer); text.value = props.filters.q ?? ''; draftZone.value = props.filters.zone ?? ''; draftTags.value = [...(props.filters.tags ?? [])]; });
onMounted(() => { document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape); });
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); });
</script>

<template>
  <div class="rd-map-toolbar">
    <div class="rd-map-toolbar__brand"><NuxtLink :to="`/${city.slug}`" aria-label="Rành Đường — về trang thành phố"><RdCompass /><span>Rành Đường<small>ĐI MỘT VÒNG, BIẾT THÊM MỘT NƠI.</small></span></NuxtLink><span class="rd-map-toolbar__stamp">SỔ TAY<br>KHÁM PHÁ</span></div>
    <div class="rd-map-toolbar__intro"><span class="rd-map-toolbar__eyebrow">THE LIVING MAP</span><h1>Bản đồ {{ city.name }}</h1><p>Bản đồ biết kể chuyện.<br><em>Chọn một ghim. Mở một nơi hay.</em></p></div>
    <form class="rd-map-toolbar__search" role="search" method="get" :action="`/${city.slug}/ban-do`" @submit="submitSearch">
      <input v-for="[key, value] in hidden('q')" :key="key" type="hidden" :name="key" :value="value">
      <label class="visually-hidden" for="map-search">Tìm địa điểm trong vùng bản đồ</label>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input id="map-search" ref="input" type="search" name="q" :value="text" placeholder="Tìm một nơi hợp gu…" maxlength="100" enterkeyhint="search" autocomplete="off" @input="onInput" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd" @focus="emit('editing', true)" @blur="emit('editing', false)" @keydown.enter="composing && $event.preventDefault()">
      <button type="submit" aria-label="Tìm địa điểm">↗</button>
    </form>
    <div class="rd-map-toolbar__categories">
      <form method="get" :action="`/${city.slug}/ban-do`" aria-label="Lọc mái che" @submit.prevent="toggleRain"><input v-for="[key, value] in hidden('rainSafe')" :key="key" type="hidden" :name="key" :value="value"><button type="submit" name="rainSafe" :value="filters.rainSafe ? 'false' : 'true'" class="rd-chip rd-chip--filter" :aria-pressed="filters.rainSafe">Trú mưa được</button></form>
      <span class="rd-map-toolbar__divider" aria-hidden="true" />
      <form method="get" :action="`/${city.slug}/ban-do`" aria-label="Lọc danh mục" @submit="selectCategory"><input v-for="[key, value] in hidden('category')" :key="key" type="hidden" :name="key" :value="value"><button type="submit" name="category" value="" class="rd-chip rd-chip--filter" :aria-pressed="!filters.category">Tất cả</button><button v-for="category in PlaceCategory.options" :key="category" type="submit" name="category" :value="category" class="rd-chip rd-chip--filter" :aria-pressed="filters.category === category">{{ CATEGORY_LABEL[category] }}</button></form>
    </div>
    <div class="rd-map-toolbar__tools">
      <details ref="advanced" class="rd-map-toolbar__advanced">
        <summary ref="advancedToggle">Lọc thêm <span v-if="filterCount">{{ filterCount }}</span><span aria-hidden="true">↓</span></summary>
        <form class="rd-map-toolbar__filter-panel" method="get" :action="`/${city.slug}/ban-do`" @submit="applyFilters">
          <input v-for="[key, value] in Object.entries(query).filter(([key]) => key !== 'zone' && key !== 'tags')" :key="key" type="hidden" :name="key" :value="value">
          <h2>Chọn nơi hợp gu</h2><p>Lọc từ những đặc điểm đã có trong ghi chép.</p>
          <label for="map-zone">Khu vực</label><select id="map-zone" v-model="draftZone" name="zone"><option value="">Mọi khu vực</option><option v-for="zone in city.zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option></select>
          <fieldset v-if="tagOptions.length"><legend>Đặc điểm địa điểm</legend><label v-for="tag in tagOptions" :key="tag"><input v-model="draftTags" type="checkbox" name="tags" :value="tag" :disabled="draftTags.length >= 10 && !draftTags.includes(tag)"><span>{{ tagLabel(tag) }}</span></label></fieldset><p v-else>Chưa có thẻ đặc điểm cho vùng này.</p>
          <button type="submit" class="rd-btn rd-btn--primary">Áp dụng bộ lọc ↗</button><a :href="`/${city.slug}/ban-do`" @click.prevent="reset">Xóa tất cả bộ lọc</a>
        </form>
      </details>
      <a v-if="activeCount" :href="`/${city.slug}/ban-do`" @click.prevent="reset">Xóa bộ lọc ({{ activeCount }})</a><span v-else class="rd-map-toolbar__hint">Rẽ một chút. Hay cả chuyến đi.</span>
    </div>
  </div>
</template>
