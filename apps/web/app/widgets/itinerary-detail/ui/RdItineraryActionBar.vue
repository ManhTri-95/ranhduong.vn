<script setup lang="ts">
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { computed } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import type { ActionBarMode } from '../lib/active-stop';

/** fixed: thanh đáy trên điện thoại (chừa chỗ qua body[data-rd-bottom]); false: khối dưới bản đồ desktop. Chỉ render ở client. */
/** mode: do actionBarMode quyết định (chỉ đường / mở bản đồ ngày / báo chưa có vị trí). */
/** ticket: có vé để chia sẻ (S30), hiện nút tròn nét đứt mở màn xem trước vé. */
const props = defineProps<{ stop: ItineraryPublicStop | null; mode: ActionBarMode; day: number; title: string; url: string; fixed: boolean; ticket: boolean }>();
const emit = defineEmits<{ showMap: []; ticket: [] }>();
const href = computed(() => (props.stop?.place ? directionHref({ ...props.stop.place, status: 'active' }) : undefined));
useHead(() => ({ bodyAttrs: { 'data-rd-bottom': props.fixed ? 'action' : undefined } }));

async function share(): Promise<void> {
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: props.title, url: props.url }); return; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heading = document.getElementById('itinerary-share-title');
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
}
</script>

<template>
  <div :class="['rd-action-bar', 'rd-itinerary-action-bar', { 'rd-itinerary-action-bar--fixed': fixed }]">
    <button type="button" class="rd-icon-btn rd-itinerary-action-bar__share" aria-label="Chia sẻ lịch trình" @click="share">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
    </button>
    <button v-if="ticket" type="button" class="rd-icon-btn rd-itinerary-action-bar__ticket" aria-label="Tạo vé để chia sẻ" @click="emit('ticket')">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z" /><path d="M14 7v10" stroke-dasharray="2 2" /></svg>
    </button>
    <a v-if="mode === 'directions' && href && stop?.place" class="rd-btn rd-btn--accent rd-itinerary-action-bar__go" :href="href" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến điểm ${stop.number}: ${stop.place.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place.id">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
      <span class="rd-itinerary-action-bar__label"><span class="rd-itinerary-action-bar__kicker">Chỉ đường · điểm {{ stop.number }}</span><span class="rd-itinerary-action-bar__name">{{ stop.place.name }}</span></span>
    </a>
    <button v-else-if="mode === 'show-map'" type="button" class="rd-btn rd-btn--primary rd-itinerary-action-bar__go" @click="emit('showMap')">Xem bản đồ ngày {{ day }}</button>
    <p v-else class="rd-itinerary-action-bar__note" role="status">{{ stop?.place ? `${stop.place.name}: vị trí đang cập nhật` : stop ? `Điểm ${stop.number} chưa có thông tin công khai` : `Ngày ${day} đang được cập nhật` }}</p>
  </div>
</template>

<style scoped>
.rd-itinerary-action-bar { flex-wrap: nowrap; }
.rd-itinerary-action-bar--fixed { position: fixed; z-index: 10; inset: auto 0 0; padding: var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom, 0px)); }
.rd-itinerary-action-bar__share { flex: 0 0 var(--button-height); width: var(--button-height); height: var(--button-height); border-color: var(--ink); }
/* Nút nét đứt cho hành động "tạo, sưu tầm" (Spec UI mục 4). */
.rd-itinerary-action-bar__ticket { flex: 0 0 var(--button-height); width: var(--button-height); height: var(--button-height); border: var(--border-strong) dashed var(--ink); }
.rd-itinerary-action-bar__go { flex: 1 1 auto; min-width: 0; padding-inline: var(--space-4); }
/* Hai dòng trong nút 52px: "Chỉ đường · điểm n" nhỏ, tên quán một dòng cắt ba chấm; aria-label vẫn có tên đầy đủ. */
.rd-itinerary-action-bar__label { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
.rd-itinerary-action-bar__kicker { font-size: 12px; font-weight: 600; }
.rd-itinerary-action-bar__name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }
.rd-itinerary-action-bar__go { justify-content: flex-start; }
.rd-itinerary-action-bar__note { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 14px; line-height: 1.4; color: var(--ink-soft); }
.rd-itinerary-action-bar:not(.rd-itinerary-action-bar--fixed) { padding: 0; border: 0; background: transparent; }
</style>
