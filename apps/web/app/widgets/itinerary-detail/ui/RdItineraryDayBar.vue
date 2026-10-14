<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ days: { day: number; count: number }[]; selectedDay: number; view: 'timeline' | 'map'; showToggle: boolean }>();
const emit = defineEmits<{ day: [day: number]; view: [view: 'timeline' | 'map'] }>();
const bar = ref<HTMLElement | null>(null);
const daysRow = ref<HTMLElement | null>(null);
const stuck = ref(false);
let observer: IntersectionObserver | undefined;

/** Link #day-n vẫn chạy khi tắt JavaScript; có JS thì trang tự cuộn có tính phần thanh dính. */
function pick(event: MouseEvent, day: number): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  emit('day', day);
}
/** Ngày đang xem đổi theo cuộn: kéo chip của ngày đó vào hàng nếu đang bị che (chỉ cuộn ngang trong hàng). */
function revealChip(): void {
  const row = daysRow.value;
  const chip = row?.querySelector<HTMLElement>('[aria-current="true"]');
  if (!row || !chip) return;
  const box = row.getBoundingClientRect();
  const rect = chip.getBoundingClientRect();
  if (rect.left < box.left) row.scrollBy({ left: rect.left - box.left - 8, behavior: 'instant' });
  else if (rect.right > box.right) row.scrollBy({ left: rect.right - box.right + 8, behavior: 'instant' });
}
watch(() => props.selectedDay, revealChip, { flush: 'post' });
onMounted(() => {
  revealChip();
  if (!bar.value || typeof IntersectionObserver !== 'function') return;
  // Thanh dính ở top: -1px nên khi đã dính sẽ bị cắt 1px: tỉ lệ thấy < 1 nghĩa là đang dính.
  observer = new IntersectionObserver(([entry]) => { stuck.value = (entry?.intersectionRatio ?? 1) < 1; }, { threshold: [1] });
  observer.observe(bar.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="bar" :class="['rd-itinerary-daybar', { 'rd-itinerary-daybar--stuck': stuck }]">
    <nav ref="daysRow" class="rd-itinerary-daybar__days" aria-label="Chọn ngày trong lịch trình">
      <a v-for="item in days" :key="item.day" :href="`#day-${item.day}`" class="rd-chip rd-chip--filter" :aria-current="item.day === selectedDay ? 'true' : undefined" @click="pick($event, item.day)">Ngày {{ item.day }}<span class="rd-itinerary-daybar__count"> · {{ item.count }} điểm</span></a>
    </nav>
    <div v-if="showToggle" class="rd-itinerary-daybar__views" role="group" aria-label="Cách xem lịch trình">
      <button type="button" :aria-pressed="view === 'timeline'" @click="emit('view', 'timeline')">Lịch</button>
      <button type="button" :aria-pressed="view === 'map'" @click="emit('view', 'map')">Bản đồ</button>
    </div>
  </div>
</template>

<style scoped>
.rd-itinerary-daybar { position: sticky; top: -1px; z-index: 5; display: flex; align-items: center; gap: var(--space-2); margin: 0 calc(-1 * var(--space-5)); padding: calc(var(--space-2) + 1px) var(--space-5) var(--space-2); background: var(--paper); border-bottom: var(--border-hair) solid transparent; transition: border-color var(--dur-standard) var(--ease-out), background-color var(--dur-standard) var(--ease-out); }
.rd-itinerary-daybar--stuck { background: var(--paper-raised); border-bottom-color: var(--line); }
.rd-itinerary-daybar__days { flex: 1; min-width: 0; display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; }
.rd-itinerary-daybar__days::-webkit-scrollbar { display: none; }
.rd-itinerary-daybar__days a { flex: 0 0 auto; text-decoration: none; }
/* Màn hẹp: chỉ ghi "Ngày n" để chip vừa cạnh công tắc Lịch, Bản đồ; số điểm có ở tiêu đề từng ngày. */
@media (max-width: 399.98px) { .rd-itinerary-daybar__count { display: none; } }
.rd-itinerary-daybar__days a[aria-current='true'] { background: var(--ink); color: var(--paper-raised); border-color: var(--ink); }
.rd-itinerary-daybar__views { flex: 0 0 auto; display: flex; padding: 2px; border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--paper-raised); }
.rd-itinerary-daybar__views button { min-height: 40px; min-width: var(--tap-min); padding: 0 var(--space-3); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink); font: 600 14px var(--font-body); cursor: pointer; transition: background-color var(--dur-standard) var(--ease-out), color var(--dur-standard) var(--ease-out); }
.rd-itinerary-daybar__views button[aria-pressed='true'] { background: var(--ink); color: var(--paper-raised); }
.rd-itinerary-daybar__views button:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
</style>
