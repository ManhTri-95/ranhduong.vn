<script setup lang="ts">
import { CATEGORY_LABEL, type ItineraryPublicStop } from '@ranhduong/contracts';
import { computed } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';
import { noteNeedsToggle } from '~/entities/itinerary/lib/itinerary-summary';
import RdJourneyPhoto from './RdJourneyPhoto.vue';
const props = defineProps<{ stop: ItineraryPublicStop; day: number; citySlug: string; selected: boolean; canMap: boolean; last: boolean; transport: string }>();
const emit = defineEmits<{ select: [key: string]; map: [key: string] }>();
const href = computed(() => props.stop.place ? directionHref({ ...props.stop.place, status: 'active' }) : undefined);
</script>

<template>
  <li class="rd-atlas-stop" :class="{ 'rd-atlas-stop--selected': selected, 'rd-atlas-stop--last': last }" :data-rd-stop-key="stop.key" data-rd-route-scene>
    <p v-if="stop.number > 1 && stop.travelMinFromPrev > 0" class="rd-atlas-stop__transfer">{{ transport }} · khoảng {{ stop.travelMinFromPrev }} phút <span>(dự kiến)</span></p>
    <div class="rd-atlas-stop__entry">
      <button class="rd-atlas-stop__number" type="button" :aria-pressed="selected" :aria-label="`Chọn điểm ${stop.number} ngày ${day}${stop.place ? `: ${stop.place.name}` : ''}`" @click="emit('select', stop.key)">{{ String(stop.number).padStart(2, '0') }}</button>
      <article class="rd-atlas-stop__postcard">
        <div class="rd-atlas-stop__top"><p><time>{{ stop.start }}</time><span aria-hidden="true"> — </span><time>{{ stop.end }}</time><span v-if="stop.kind === 'meal'"> · Bữa ăn</span></p><span v-if="selected" class="rd-atlas-stop__selected-label">Đang chọn</span></div>
        <div class="rd-atlas-stop__main">
          <NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`" class="rd-atlas-stop__photo" :aria-label="`Xem ảnh và thông tin ${stop.place.name}`"><RdJourneyPhoto :place="stop.place" /></NuxtLink>
          <div v-else class="rd-atlas-stop__photo"><RdJourneyPhoto :place="null" /></div>
          <div class="rd-atlas-stop__copy">
            <p class="rd-atlas-eyebrow">{{ stop.place ? CATEGORY_LABEL[stop.place.category] : 'Điểm dừng' }}</p>
            <h3 :id="`stop-${stop.key}`" tabindex="-1"><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
            <p v-if="stop.place?.zoneName" class="rd-atlas-stop__area">{{ stop.place.zoneName }}</p>
            <p v-if="stop.place?.unconfirmed" class="rd-atlas-stop__caveat">Thông tin chưa được quán xác nhận</p>
            <p v-if="stop.place && !stop.place.location" class="rd-atlas-stop__caveat">Vị trí đang cập nhật</p>
            <p v-if="!stop.place" class="rd-atlas-stop__caveat">Chỗ này hiện chưa có thông tin công khai. Bạn chọn điểm khác trên bản đồ nhé.</p>
          </div>
        </div>
        <details v-if="stop.note && noteNeedsToggle(stop.note)" class="rd-atlas-stop__notes"><summary>Ghi chú điểm dừng</summary><p>{{ stop.note }}</p></details>
        <p v-else-if="stop.note" class="rd-atlas-stop__note">{{ stop.note }}</p>
        <div v-if="selected && (stop.place?.address || stop.place?.practicalNotes)" class="rd-atlas-stop__practical"><p v-if="stop.place.address">{{ stop.place.address }}</p><p v-if="stop.place.practicalNotes">{{ stop.place.practicalNotes }}</p></div>
        <div class="rd-atlas-stop__actions">
          <button v-if="canMap && stop.place?.location" type="button" @click="emit('map', stop.key)">Xem trên bản đồ <span aria-hidden="true">↗</span></button>
          <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">Chỉ đường <span aria-hidden="true">↗</span></a>
          <NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">Chi tiết <span aria-hidden="true">↗</span></NuxtLink>
        </div>
      </article>
    </div>
  </li>
</template>
