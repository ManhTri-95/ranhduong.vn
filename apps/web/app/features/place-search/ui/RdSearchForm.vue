<script setup lang="ts">
import { CATEGORY_LABEL } from '@ranhduong/contracts';
import { searchKey } from '@ranhduong/geo';
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue';
import { fetchPlaceSuggestions } from '~/entities/place/api/places';
import { useApiBase } from '~/shared/api/client';
import { createSearchSuggestions, type SearchSuggestionsState } from '../lib/search-suggestions';

const props = defineProps<{ action: string; citySlug: string; query?: string }>();
const inputId = useId();
const listId = `${inputId}-suggestions`;
const statusId = `${inputId}-status`;
const apiBase = useApiBase();
const text = ref(props.query ?? '');
const inputElement = ref<HTMLInputElement>();
const visible = ref(false);
const composing = ref(false);
const active = ref(-1);
const state = shallowRef<SearchSuggestionsState>({ items: [], pending: false, failed: false });
const suggestions = createSearchSuggestions(
  (q, signal) => fetchPlaceSuggestions(apiBase, props.citySlug, q, signal),
  (next) => { state.value = next; active.value = -1; },
);
const hasOptions = computed(() => visible.value && state.value.items.length > 0);
const activeId = computed(() => hasOptions.value && active.value >= 0 ? `${listId}-${active.value}` : undefined);
const status = computed(() => {
  if (!visible.value) return '';
  if (state.value.pending) return 'Đang tìm gợi ý…';
  if (state.value.failed) return 'Chưa tải được gợi ý. Bạn vẫn có thể bấm Tìm.';
  if (!state.value.items.length) return 'Chưa có gợi ý. Thử gõ ngắn hơn nhé.';
  return `${state.value.items.length} gợi ý. Dùng phím lên, xuống để chọn.`;
});

function dismiss(): void {
  visible.value = false;
  suggestions.cancel();
}

function search(): void {
  if (composing.value) return;
  visible.value = searchKey(text.value).length >= 2;
  suggestions.search(text.value);
}

function retry(): void {
  // Focus first: removing the focused retry button would trigger focusout and cancel the new request.
  // The input's focus handler already starts the search; only start explicitly when it was focused.
  if (document.activeElement === inputElement.value) search();
  else inputElement.value?.focus();
}

function input(event: Event): void {
  text.value = (event.target as HTMLInputElement).value;
  if (!composing.value) search();
}

function compositionStart(): void {
  composing.value = true;
  dismiss();
}

function compositionEnd(event: CompositionEvent): void {
  composing.value = false;
  input(event);
}

function focusOut(event: FocusEvent): void {
  const form = event.currentTarget as HTMLFormElement;
  if (!(event.relatedTarget instanceof Node) || !form.contains(event.relatedTarget)) dismiss();
}

function keydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing || event.keyCode === 229) {
    if (event.key === 'Enter') event.preventDefault();
    return;
  }
  if (event.key === 'Escape') {
    if (visible.value) event.preventDefault();
    dismiss();
  } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && hasOptions.value) {
    event.preventDefault();
    const count = state.value.items.length;
    active.value = event.key === 'ArrowDown' ? (active.value + 1) % count : (active.value <= 0 ? count : active.value) - 1;
  } else if (event.key === 'Enter' && hasOptions.value && active.value >= 0) {
    const place = state.value.items[active.value];
    if (place) {
      event.preventDefault();
      dismiss();
      void navigateTo(`/${props.citySlug}/dia-diem/${place.slug}`);
    }
  }
}

function submit(event: SubmitEvent): void {
  if (composing.value) event.preventDefault();
  else dismiss();
}

watch(() => [props.query, props.citySlug], () => { text.value = props.query ?? ''; dismiss(); });
onBeforeUnmount(dismiss);
</script>

<template>
  <form class="rd-search search" role="search" :action="action" method="get" @focusout="focusOut" @submit="submit">
    <label class="rd-search__label" :for="inputId">Tìm kiếm</label>
    <div class="rd-search__field field">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        :id="inputId"
        ref="inputElement"
        name="q"
        type="search"
        :value="text"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="hasOptions"
        :aria-controls="hasOptions ? listId : undefined"
        :aria-activedescendant="activeId"
        :aria-describedby="statusId"
        placeholder="Quán cà phê, đồi chè, ăn sáng…"
        maxlength="100"
        enterkeyhint="search"
        autocomplete="off"
        @input="input"
        @focus="search"
        @keydown="keydown"
        @compositionstart="compositionStart"
        @compositionend="compositionEnd"
      >
      <button class="submit" type="submit" aria-label="Tìm">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
    <div v-if="visible" class="rd-search__suggestions">
      <ul v-if="hasOptions" :id="listId" class="rd-search__options" role="listbox" aria-label="Gợi ý địa điểm">
        <li v-for="(place, index) in state.items" :key="place.slug" role="presentation">
          <NuxtLink
            :id="`${listId}-${index}`"
            class="rd-search__option"
            :to="`/${citySlug}/dia-diem/${place.slug}`"
            role="option"
            :aria-selected="active === index"
            tabindex="-1"
            @mousedown.prevent
            @pointermove="active = index"
            @click="dismiss"
          >
            <span class="rd-search__name">{{ place.name }}</span>
            <span class="rd-search__meta">{{ CATEGORY_LABEL[place.category] }}{{ place.zoneName ? ` · ${place.zoneName}` : '' }}</span>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="rd-search__message" aria-hidden="true">{{ status }}</p>
      <button v-if="state.failed" class="rd-btn rd-btn--secondary rd-search__retry" type="button" @click="retry">Thử lại</button>
    </div>
    <p :id="statusId" class="rd-search__status" role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
  </form>
</template>

<style scoped>
/* Ô nhập của design system tắt outline; hiện vòng focus trên cả khung. */
.search { position: relative; }
.field:focus-within { outline: 3px solid var(--ink); outline-offset: 2px; }
.submit { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 var(--tap-min); height: var(--tap-min); margin-right: calc(-1 * var(--space-3)); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink); cursor: pointer; }
.submit:focus-visible { outline: 3px solid var(--ink); outline-offset: -3px; }
.rd-search__suggestions { position: absolute; top: calc(100% + var(--space-2)); left: 0; right: 0; z-index: 20; background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-card); box-shadow: var(--shadow-float); overflow: hidden; }
.rd-search__options { list-style: none; padding: var(--space-2); margin: 0; }
.rd-search__option { display: flex; flex-direction: column; justify-content: center; min-height: var(--tap-min); padding: var(--space-3); border-radius: var(--radius-chip); text-decoration: none; color: var(--ink); overflow-wrap: anywhere; }
.rd-search__option:hover, .rd-search__option[aria-selected='true'] { background: var(--mist); }
.rd-search__name { font-weight: 600; }
.rd-search__meta { color: var(--ink-soft); font-size: 0.875rem; }
.rd-search__message { padding: var(--space-4); margin: 0; color: var(--ink-soft); }
.rd-search__retry { margin: 0 var(--space-4) var(--space-4); }
.rd-search__status { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
