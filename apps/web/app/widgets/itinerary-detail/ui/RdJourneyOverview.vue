<script setup lang="ts">
import type { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { daySpan } from '~/entities/itinerary/lib/itinerary-summary';
defineProps<{ days: ItineraryTemplateDetail['days']; selectedDay: number }>();
const emit = defineEmits<{ day: [day: number] }>();
function pick(event: MouseEvent, day: number): void {
  if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault(); emit('day', day);
}
</script>

<template>
  <section class="rd-atlas-overview" aria-labelledby="atlas-overview-title">
    <div class="rd-atlas-overview__intro"><p class="rd-atlas-eyebrow">Mỗi ngày, một chương</p><h2 id="atlas-overview-title">Nhìn một vòng.<br>Rồi bắt đầu đi.</h2><p>Chọn một ngày để xem các điểm ghé và bản đồ cùng nhau.</p></div>
    <nav class="rd-atlas-overview__days" aria-label="Tổng quan từng ngày">
      <a v-for="day in days" :key="day.day" :href="`#day-${day.day}`" :aria-current="selectedDay === day.day ? 'true' : undefined" @click="pick($event, day.day)">
        <span class="rd-atlas-overview__chapter">CHƯƠNG <span>{{ String(day.day).padStart(2, '0') }}</span></span>
        <strong>Ngày {{ day.day }} <span aria-hidden="true">↗</span></strong>
        <span>{{ day.stops.length }} điểm dừng <template v-if="daySpan(day)">· {{ daySpan(day)!.start }}–{{ daySpan(day)!.end }}</template></span>
        <span class="rd-atlas-overview__places">{{ day.stops.flatMap(stop => stop.place ? [stop.place.name] : []).slice(0, 2).join(' → ') || 'Ngày này đang được cập nhật' }}</span>
      </a>
    </nav>
  </section>
</template>
