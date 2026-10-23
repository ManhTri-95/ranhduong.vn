<script setup lang="ts">
import { CATEGORY_LABEL, PACE_LABEL, TRANSPORT_LABEL, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { computed } from 'vue';
import { atlasCover } from '~/entities/itinerary/lib/journey-atlas';
import { itinerarySummary, noteNeedsToggle, DESCRIPTION_PREVIEW_CHARS, summaryLine } from '~/entities/itinerary/lib/itinerary-summary';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdDestinationPhoto from '~/shared/ui/RdDestinationPhoto.vue';
import RdJourneyPhoto from './RdJourneyPhoto.vue';

const props = defineProps<{ itinerary: ItineraryTemplateDetail; cityName: string; citySlug: string }>();
const cover = computed(() => atlasCover(props.itinerary.days));
const summary = computed(() => itinerarySummary(props.itinerary.days));
const interests = computed(() => [...new Set(props.itinerary.days.flatMap(day => day.stops.flatMap(stop => stop.place ? [stop.place.category, ...stop.place.alsoCategories] : [])))].map(category => CATEGORY_LABEL[category]));
const descriptionLong = computed(() => noteNeedsToggle(props.itinerary.description, DESCRIPTION_PREVIEW_CHARS));
</script>

<template>
  <header class="rd-atlas-cover" data-rd-route-scene>
    <div class="rd-atlas-cover__copy">
      <p class="rd-atlas-eyebrow"><span aria-hidden="true">↗</span> Cuốn bản đồ hành trình <span class="rd-atlas-cover__edition">RÀNH ĐƯỜNG</span></p>
      <p class="rd-atlas-cover__destination">{{ cityName }} <span aria-hidden="true">/</span> {{ itinerary.days.length }} ngày khám phá</p>
      <h1>{{ itinerary.title }}</h1>
      <p class="rd-itinerary-detail__summary">{{ summaryLine(summary) || 'Lịch trình đang cập nhật' }}</p>
      <div v-if="itinerary.description" class="rd-atlas-cover__description">
        <input v-if="descriptionLong" id="itinerary-description-more" type="checkbox" class="rd-more-toggle visually-hidden">
        <p :class="{ 'rd-clamp rd-clamp--3': descriptionLong }">{{ itinerary.description }}</p>
        <label v-if="descriptionLong" for="itinerary-description-more" class="rd-more-label"><span class="rd-more-label__open">Đọc thêm</span><span class="rd-more-label__close">Thu gọn</span></label>
      </div>
      <ul class="rd-atlas-cover__tags" aria-label="Đặc điểm lịch trình">
        <li>{{ TRANSPORT_LABEL[itinerary.transport] }}</li><li>{{ PACE_LABEL[itinerary.pace] }}</li>
        <li v-if="itinerary.season">{{ itinerary.season }}</li><li v-if="itinerary.style">{{ itinerary.style }}</li>
      </ul>
      <p v-if="interests.length" class="rd-atlas-cover__interests">{{ interests.join(' · ') }}</p>
      <div class="rd-atlas-cover__actions"><a class="rd-btn rd-btn--primary" href="#journey-chapters">Xem hành trình <span aria-hidden="true">↓</span></a><a class="rd-btn rd-btn--outline" href="#itinerary-share-title">Rủ bạn đi cùng <span aria-hidden="true">↗</span></a></div>
    </div>
    <figure class="rd-atlas-cover__postcard">
      <div class="rd-atlas-cover__image">
        <RdJourneyPhoto v-if="cover?.place" :place="cover.place" priority sizes="(min-width: 1024px) 45vw, 100vw" />
        <RdDestinationPhoto v-else-if="citySlug === 'da-lat'" photo="landscape" :city-slug="citySlug" priority sizes="(min-width: 1024px) 45vw, 100vw" />
        <div v-else class="rd-atlas-cover__cartography"><RdCompass /></div>
        <span class="rd-atlas-cover__stamp"><span>{{ itinerary.days.length }} NGÀY</span><span>{{ summary.stopCount }} ĐIỂM DỪNG</span></span>
      </div>
      <figcaption><span>{{ cover?.place ? `Trong hành trình · ${cover.place.name}` : citySlug === 'da-lat' ? `Ảnh điểm đến · ${cityName}` : `Sổ hành trình · ${cityName}` }}</span><span aria-hidden="true">ĐI MỘT VÒNG,<br>BIẾT THÊM MỘT NƠI.</span></figcaption>
      <svg class="rd-atlas-cover__route" viewBox="0 0 420 110" fill="none" aria-hidden="true"><path pathLength="1" d="M8 90C100 90 40 12 150 22S230 120 310 60s65-40 100-45" /><circle cx="8" cy="90" r="5" /><circle cx="410" cy="15" r="5" /></svg>
    </figure>
  </header>
</template>
