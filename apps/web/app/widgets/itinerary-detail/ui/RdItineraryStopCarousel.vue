<script setup lang="ts">
import { CATEGORY_LABEL, type ItineraryPublicStop } from '@ranhduong/contracts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';

const props = defineProps<{ stops: ItineraryPublicStop[]; selectedKey: string | null; citySlug: string }>();
const emit = defineEmits<{ select: [key: string] }>();
const list = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;
/** Đang tự cuộn tới thẻ (vì người dùng bấm ghim): bỏ qua các thẻ đi ngang qua, rồi đọc lại thẻ đang dừng. */
let ignoreUntil = 0;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
/** Lần gọi đầu của IntersectionObserver luôn báo mọi thẻ; không được coi đó là người dùng vuốt. */
let skipInitial = true;
/** Thẻ vừa được chọn do người dùng vuốt: không tự cuộn lại khi ngón tay còn đang kéo. */
let lastEmitted: string | null = null;
const direction = (stop: ItineraryPublicStop) => stop.place ? directionHref({ ...stop.place, status: 'active' }) : undefined;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cardOf = (key: string) => list.value?.querySelector<HTMLElement>(`[data-stop-key="${CSS.escape(key)}"]`) ?? null;

function pick(key: string): void {
  if (key === props.selectedKey) return;
  lastEmitted = key;
  emit('select', key);
}
/** Thẻ đang lộ nhiều nhất trong dải, sau khi cuộn dừng. */
function mostVisibleKey(): string | undefined {
  if (!list.value) return undefined;
  const box = list.value.getBoundingClientRect();
  let best: { key: string; width: number } | undefined;
  list.value.querySelectorAll<HTMLElement>('[data-stop-key]').forEach((card) => {
    const rect = card.getBoundingClientRect();
    const width = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
    if (card.dataset.stopKey && (!best || width > best.width)) best = { key: card.dataset.stopKey, width };
  });
  return best?.key;
}
/** Cuộn ngang trong dải (không cuộn trang), canh thẻ theo mép trái như scroll-snap. */
function align(key: string, behavior: ScrollBehavior): void {
  const card = cardOf(key);
  if (!card || !list.value) return;
  const padding = Number.parseFloat(getComputedStyle(list.value).scrollPaddingLeft) || 0;
  list.value.scrollBy({ left: card.getBoundingClientRect().left - list.value.getBoundingClientRect().left - padding, behavior });
}
function observe(): void {
  observer?.disconnect();
  if (!list.value || typeof IntersectionObserver !== 'function') return;
  skipInitial = true;
  observer = new IntersectionObserver((entries) => {
    if (skipInitial) { skipInitial = false; return; }
    if (performance.now() < ignoreUntil) return;
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    const key = visible?.target instanceof HTMLElement ? visible.target.dataset.stopKey : undefined;
    if (key) pick(key);
  }, { root: list.value, threshold: 0.6 });
  list.value.querySelectorAll('[data-stop-key]').forEach((card) => observer?.observe(card));
}
watch(() => props.selectedKey, async (key) => {
  if (!key || key === lastEmitted) return;
  lastEmitted = null;
  await nextTick();
  const card = cardOf(key);
  if (!card || !list.value) return;
  const box = list.value.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  if (rect.left >= box.left && rect.right <= box.right) return;
  ignoreUntil = performance.now() + 600;
  align(key, reduced() ? 'instant' : 'smooth');
  clearTimeout(settleTimer);
  // Hết khoảng bỏ qua thì đọc lại thẻ đang dừng, phòng khi người dùng vuốt tiếp trong lúc tự cuộn.
  settleTimer = setTimeout(() => { const settled = mostVisibleKey(); if (settled) pick(settled); }, 650);
});
watch(() => props.stops, async () => { await nextTick(); if (props.selectedKey) align(props.selectedKey, 'instant'); observe(); });
onMounted(() => {
  // Mở chế độ Bản đồ từ một điểm cụ thể: dải bắt đầu ở thẻ đó, không nhảy về thẻ đầu.
  if (props.selectedKey) align(props.selectedKey, 'instant');
  observe();
});
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(settleTimer); });
</script>

<template>
  <ol ref="list" class="rd-itinerary-carousel" aria-label="Các điểm trong ngày">
    <li v-for="stop in stops" :key="stop.key" :data-stop-key="stop.key" :class="['rd-itinerary-carousel__card', { 'rd-itinerary-carousel__card--selected': stop.key === selectedKey }]">
      <span class="rd-itinerary-carousel__number" aria-hidden="true">{{ stop.number }}</span>
      <div class="rd-itinerary-carousel__body">
        <p class="rd-itinerary-carousel__time">{{ stop.start }}–{{ stop.end }}<template v-if="stop.kind === 'meal'"> · Bữa ăn</template></p>
        <h3><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
        <p v-if="stop.place" class="rd-itinerary-carousel__meta">{{ CATEGORY_LABEL[stop.place.category] }}<template v-if="stop.place.zoneName"> · {{ stop.place.zoneName }}</template></p>
      </div>
      <a v-if="direction(stop)" :href="direction(stop)" class="rd-icon-btn rd-itinerary-carousel__go" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
      </a>
    </li>
  </ol>
</template>

<style scoped>
.rd-itinerary-carousel { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: var(--space-3) var(--space-5); display: flex; gap: var(--space-3); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--space-5); overscroll-behavior-x: contain; scrollbar-width: none; }
.rd-itinerary-carousel::-webkit-scrollbar { display: none; }
.rd-itinerary-carousel__card { flex: 0 0 min(280px, 82%); scroll-snap-align: start; display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); box-sizing: border-box; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); transition: border-color var(--dur-standard) var(--ease-out), box-shadow var(--dur-standard) var(--ease-out); }
.rd-itinerary-carousel__card--selected { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.rd-itinerary-carousel__number { flex: 0 0 32px; height: 32px; display: grid; place-items: center; box-sizing: border-box; border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); font: 700 15px var(--font-body); }
.rd-itinerary-carousel__card--selected .rd-itinerary-carousel__number { background: var(--accent); color: var(--ink); border: var(--border-strong) solid var(--ink); }
.rd-itinerary-carousel__body { flex: 1; min-width: 0; }
.rd-itinerary-carousel__body p, .rd-itinerary-carousel__body h3 { margin: 0; }
.rd-itinerary-carousel__time, .rd-itinerary-carousel__meta { font-size: 13px; color: var(--ink-soft); }
.rd-itinerary-carousel__body h3 { font: 700 16px/1.35 var(--font-body); }
.rd-itinerary-carousel__body h3 a { text-decoration: none; }
.rd-itinerary-carousel__go { flex: 0 0 auto; border-color: var(--ink); }
.rd-itinerary-carousel__go svg { width: 20px; height: 20px; }
</style>
