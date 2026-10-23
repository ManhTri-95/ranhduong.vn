<script setup lang="ts">
import { CATEGORY_LABEL, PUBLIC_CATEGORIES, type PublicCategory, type TagCount } from '@ranhduong/contracts';
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { discoveryHref, discoveryIndexable, parseDiscoveryQuery, type DiscoveryFilter } from '~/entities/place/lib/discovery-query';
import { tagChips, visibleTagChips } from '../lib/tag-chips';

const props = defineProps<{ action: string; filter: DiscoveryFilter; tags: TagCount[]; mapHref: string; fixedCategory?: PublicCategory; zones?: readonly { slug: string; name: string }[] }>();
const inputId = useId();
const root = ref<HTMLElement | null>(null);
const text = ref(props.filter.q ?? '');
const composing = ref(false);
const pending = ref(false);
const failed = ref(false);
const focusMemory = useState<{ path: string; control: string } | null>('discovery-filter-focus', () => null);
const groups = computed(() => visibleTagChips(tagChips(props.tags, props.filter.tags)));
const filtered = computed(() => !discoveryIndexable({ ...props.filter, cursor: undefined }));
const selectedLabels = computed(() => tagChips(props.tags, props.filter.tags).filter(chip => chip.pressed).map(chip => chip.label));
const detailCount = computed(() => Number(Boolean(props.fixedCategory ? props.filter.zone : props.filter.category)) + Number(props.filter.rainSafe));
const zoneName = computed(() => props.zones?.find(zone => zone.slug === props.filter.zone)?.name);
let disposed = false;

async function navigate(filter: DiscoveryFilter, control: string): Promise<void> {
  if (pending.value) return;
  const target = discoveryHref(props.action, { ...filter, category: props.fixedCategory ? undefined : filter.category, cursor: undefined });
  if (target === discoveryHref(props.action, props.filter)) return;
  pending.value = true; failed.value = false;
  focusMemory.value = { path: props.action, control };
  try { await navigateTo(target); }
  catch { if (!disposed) { failed.value = true; focusMemory.value = null; } }
  finally { if (!disposed) pending.value = false; }
}
function search(event: SubmitEvent): void {
  event.preventDefault();
  if (composing.value) return;
  void navigate(parseDiscoveryQuery({ ...props.filter, tags: props.filter.tags.join(','), q: text.value, rainSafe: props.filter.rainSafe ? 'true' : undefined, cursor: undefined }), 'search');
}
function tagSubmit(event: SubmitEvent): void {
  if (!(event.submitter instanceof HTMLButtonElement)) return;
  event.preventDefault();
  void navigate({ ...props.filter, tags: event.submitter.value.split(',').filter(Boolean) }, `tag:${event.submitter.dataset.slug}`);
}
function apply(event: SubmitEvent): void {
  event.preventDefault();
  const values = new FormData(event.currentTarget as HTMLFormElement);
  void navigate(parseDiscoveryQuery({ q: props.filter.q, tags: props.filter.tags.join(','), category: String(values.get('category') ?? ''), zone: props.fixedCategory ? String(values.get('zone') ?? '') : undefined, rainSafe: values.get('rainSafe') === 'true' ? 'true' : undefined }), 'advanced');
}
function clear(event: MouseEvent): void {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void navigate({ tags: [], rainSafe: false }, 'search');
}
onMounted(() => {
  const saved = focusMemory.value;
  if (saved?.path !== props.action) return;
  focusMemory.value = null;
  const control = [...(root.value?.querySelectorAll<HTMLElement>('[data-field-control]') ?? [])].find(element => element.dataset.fieldControl === saved.control);
  const disclosure = control?.closest<HTMLDetailsElement>('details');
  if (disclosure) disclosure.open = true;
  control?.focus({ preventScroll: true });
});
onBeforeUnmount(() => { disposed = true; });
</script>

<template>
  <section ref="root" class="rd-field-filters" :aria-label="fixedCategory ? 'Tìm và lọc địa điểm theo danh mục' : 'Tìm và lọc địa điểm trong khu vực'" :aria-busy="pending">
    <div class="rd-field-filters__toolbar">
      <form class="rd-field-filters__search" method="get" :action="action" role="search" @submit="search">
        <label :for="inputId" class="visually-hidden">{{ fixedCategory ? 'Tìm địa điểm trong danh mục' : 'Tìm địa điểm trong khu vực' }}</label>
        <input v-if="filter.zone" type="hidden" name="zone" :value="filter.zone">
        <input v-if="filter.tags.length" type="hidden" name="tags" :value="filter.tags.join(',')"><input v-if="filter.category" type="hidden" name="category" :value="filter.category"><input v-if="filter.rainSafe" type="hidden" name="rainSafe" value="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
        <input :id="inputId" v-model="text" data-field-control="search" type="search" name="q" maxlength="100" placeholder="Tìm một nơi hợp gu…" enterkeyhint="search" @compositionstart="composing = true" @compositionend="composing = false" @keydown.enter="composing && $event.preventDefault()">
        <button type="submit" :disabled="pending">{{ pending ? 'Đang tìm…' : 'Tìm' }}</button>
      </form>
      <NuxtLink class="rd-field-filters__map" :to="mapHref">Bản đồ <span aria-hidden="true">↗</span></NuxtLink>
    </div>
    <div class="rd-field-filters__controls">
      <form v-if="groups.shown.length" class="rd-field-filters__tagform" method="get" :action="action" aria-label="Lọc theo sở thích" @submit="tagSubmit">
        <input v-if="filter.zone" type="hidden" name="zone" :value="filter.zone">
        <input v-if="filter.q" type="hidden" name="q" :value="filter.q"><input v-if="filter.category" type="hidden" name="category" :value="filter.category"><input v-if="filter.rainSafe" type="hidden" name="rainSafe" value="true">
        <ul class="rd-field-filters__chips"><li v-for="chip in groups.shown" :key="chip.slug"><button type="submit" name="tags" :value="chip.value" :data-slug="chip.slug" :data-field-control="`tag:${chip.slug}`" :aria-pressed="chip.pressed" :disabled="pending"><span aria-hidden="true">{{ chip.pressed ? '✓' : '↗' }}</span>{{ chip.label }}<small v-if="chip.count">{{ chip.count }}<span class="visually-hidden"> nơi có thẻ này trong phạm vi đang xem, trước khi lọc thẻ và từ khóa</span></small></button></li></ul>
        <details v-if="groups.hidden.length" class="rd-field-filters__more"><summary>Thêm {{ groups.hidden.length }} thẻ</summary><ul class="rd-field-filters__chips"><li v-for="chip in groups.hidden" :key="chip.slug"><button type="submit" name="tags" :value="chip.value" :data-slug="chip.slug" :data-field-control="`tag:${chip.slug}`" :aria-pressed="chip.pressed" :disabled="pending">{{ chip.label }}<small v-if="chip.count">{{ chip.count }}</small></button></li></ul></details>
      </form>
      <details class="rd-field-filters__advanced"><summary data-field-control="advanced">{{ fixedCategory ? 'Khu vực & mái che' : 'Danh mục & mái che' }} <span v-if="detailCount">{{ detailCount }}</span></summary>
        <form method="get" :action="action" @submit="apply">
          <input v-if="filter.q" type="hidden" name="q" :value="filter.q"><input v-if="filter.tags.length" type="hidden" name="tags" :value="filter.tags.join(',')">
          <label v-if="!fixedCategory">Danh mục<select name="category" :value="filter.category ?? ''"><option value="">Tất cả danh mục</option><option v-for="category in PUBLIC_CATEGORIES" :key="category" :value="category">{{ CATEGORY_LABEL[category] }}</option></select></label>
          <label v-else-if="zones?.length">Khu vực<select name="zone" :value="filter.zone ?? ''"><option value="">Tất cả khu vực</option><option v-for="zone in zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option></select></label>
          <label class="rd-field-filters__rain"><input name="rainSafe" type="checkbox" value="true" :checked="filter.rainSafe">Có mái che một phần hoặc toàn bộ</label>
          <button type="submit" class="rd-btn rd-btn--primary" :disabled="pending">Áp dụng bộ lọc</button>
        </form>
      </details>
    </div>
    <p v-if="filtered" class="rd-field-filters__active">Đang lọc<span v-if="filter.q"> · “{{ filter.q }}”</span><span v-if="filter.category"> · {{ CATEGORY_LABEL[filter.category] }}</span><span v-if="zoneName"> · {{ zoneName }}</span><span v-if="filter.rainSafe"> · Có mái che</span><span v-if="selectedLabels.length"> · {{ selectedLabels.join(', ') }}</span> · <a :href="action" @click="clear">Xóa bộ lọc</a></p>
    <p class="rd-field-filters__feedback" role="status" aria-live="polite">{{ failed ? 'Chưa đổi được bộ lọc. Thử lại nhé.' : pending ? 'Đang cập nhật những nơi hợp gu…' : '' }}</p>
  </section>
</template>
