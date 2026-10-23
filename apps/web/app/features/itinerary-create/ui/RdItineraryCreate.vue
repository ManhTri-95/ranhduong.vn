<script setup lang="ts">
import { ItineraryPace, ItineraryTransport, TripInterest, TripWith, TRIP_INTEREST_LABEL, TRIP_WITH_LABEL, PACE_LABEL, TRANSPORT_LABEL, type CityPublic, type GeoPoint, type PlanSuggestion, type TripDays } from '@ranhduong/contracts';
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { createGuestItinerary } from '~/entities/itinerary/api/guest-itineraries';
import { useApiBase } from '~/shared/api/client';
import { createItineraryFlow, vietnamToday } from '../lib/create-flow';
import RdStayMapError from './RdStayMapError.vue';

const props = defineProps<{ city: CityPublic }>();
const RdStayMap = defineAsyncComponent({ loader: () => import('./RdStayMap.client.vue'), errorComponent: RdStayMapError, timeout: 15_000 });
const apiBase = useApiBase();
const controller = new AbortController();
const flow = createItineraryFlow(props.city, input => createGuestItinerary(apiBase, props.city.slug, input, controller.signal), path => navigateTo(path));
const { request, pending, created, error, selectedZone } = flow;
const choicesLocked = computed(() => pending.value || created.value);
const mapOpen = ref(false);
const dateReady = ref(false);
const today = ref('');
const notice = ref<HTMLElement>();
const dateInput = ref<HTMLInputElement>();
const days: TripDays[] = [1, 2, 3, 4, 5];
const stayLabel = computed(() => !request.stayLocation ? 'Chưa chọn nơi ở' : selectedZone.value ? props.city.zones.find(zone => zone.slug === selectedZone.value)?.name : 'Đã ghim trên bản đồ');
const interestSummary = computed(() => request.tags.length ? request.tags.map(tag => TRIP_INTEREST_LABEL[tag]).join(' · ') : 'Để mình gợi ý những chỗ hợp chuyến đi.');
function refreshToday(): void { today.value = vietnamToday(); }
function pin(location: GeoPoint): void { if (!choicesLocked.value) { request.stayLocation = location; selectedZone.value = null; } }
function skip(): void { flow.skipStay(); mapOpen.value = false; }
function selectZone(slug: string): void { flow.selectZone(slug); mapOpen.value = false; }
function suggestionLabel(suggestion: PlanSuggestion): string { return suggestion.kind === 'reduce_days' ? `Thử ${suggestion.days} ngày` : 'Thử không chọn gu'; }
async function submit(): Promise<void> {
  refreshToday(); await flow.submit();
  if (error.value) { await nextTick(); notice.value?.focus(); }
}
async function apply(suggestion: PlanSuggestion): Promise<void> { flow.applySuggestion(suggestion); await submit(); }
onMounted(() => { refreshToday(); request.startDate = today.value; dateReady.value = true; });
onBeforeUnmount(() => { flow.dispose(); controller.abort(); });
</script>

<template>
  <form class="rd-create" :aria-busy="pending" @submit.prevent="submit">
    <div class="rd-create__steps">
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>01</span> Mình đi mấy ngày?</legend>
        <div class="rd-create__choices rd-create__days">
          <button v-for="day in days" :key="day" type="button" :aria-pressed="request.days === day" @click="request.days = day"><b>{{ day }}</b><span>ngày</span></button>
        </div>
        <p v-if="request.days === 5" class="rd-create__hint">Ngày thứ 5 mình dành để đi thong thả, ghé cà phê và mua chút đặc sản.</p>
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>02</span> Khi nào mình lên đường?</legend>
        <label for="trip-start-date" class="rd-create__hint">Ngày bắt đầu, theo giờ Việt Nam</label>
        <input id="trip-start-date" ref="dateInput" type="date" :value="dateReady ? request.startDate : ''" :min="today || undefined" required @focus="refreshToday" @input="request.startDate = dateInput?.value ?? ''">
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>03</span> Mình di chuyển bằng gì?</legend>
        <div class="rd-create__choices"><button v-for="value in ItineraryTransport.options" :key="value" type="button" :aria-pressed="request.transport === value" @click="request.transport = value">{{ TRANSPORT_LABEL[value] }}</button></div>
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>04</span> Chuyến này đi cùng ai?</legend>
        <div class="rd-create__choices"><button v-for="value in TripWith.options" :key="value" type="button" :aria-pressed="request.with === value" @click="request.with = value">{{ TRIP_WITH_LABEL[value] }}</button></div>
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>05</span> Bạn thích ghé những đâu?</legend>
        <p id="trip-interest-help" class="rd-create__hint">Chọn tối đa 3 gu, hoặc để trống để mình gợi ý. Gu giúp ưu tiên chỗ hợp bạn.</p>
        <div class="rd-create__choices" aria-describedby="trip-interest-help"><button v-for="value in TripInterest.options" :key="value" type="button" :aria-pressed="request.tags.includes(value)" :disabled="request.tags.length >= 3 && !request.tags.includes(value)" @click="flow.toggleInterest(value)">{{ TRIP_INTEREST_LABEL[value] }}</button></div>
        <p class="rd-create__count" role="status">Đã chọn {{ request.tags.length }}/3 gu</p>
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>06</span> Đi thong thả hay ghé nhiều chỗ?</legend>
        <div class="rd-create__choices"><button v-for="value in ItineraryPace.options" :key="value" type="button" :aria-pressed="request.pace === value" @click="request.pace = value">{{ PACE_LABEL[value] }}</button></div>
      </fieldset>
      <fieldset :disabled="choicesLocked" class="rd-create__step">
        <legend><span>07</span> Bạn ở khu nào?</legend>
        <p class="rd-create__hint">Chưa đặt chỗ thì bỏ qua cũng được. Biết nơi ở, mình xếp tuyến gần bạn hơn.</p>
        <div class="rd-create__choices">
          <button type="button" :aria-pressed="!request.stayLocation && !mapOpen" @click="skip">Bỏ qua</button>
          <button v-for="zone in city.zones.filter(zone => zone.center)" :key="zone.slug" type="button" :aria-pressed="selectedZone === zone.slug" @click="selectZone(zone.slug)">{{ zone.name }}</button>
          <button type="button" :aria-expanded="mapOpen" aria-controls="stay-map" @click="mapOpen = !mapOpen">{{ mapOpen ? 'Đóng bản đồ' : 'Ghim trên bản đồ' }}</button>
        </div>
        <div v-if="mapOpen" id="stay-map" class="rd-create__map" :inert="choicesLocked"><RdStayMap :city="city" :location="request.stayLocation" @select="pin" /></div>
        <p class="rd-create__hint" role="status">{{ stayLabel }}{{ selectedZone ? ' · Dùng vị trí giữa khu để ước tính tuyến.' : '' }}</p>
        <p class="rd-create__privacy">Chỉ lưu vị trí làm tròn khoảng 550 m để xếp tuyến. Nơi ở không hiện trong lịch chia sẻ. <NuxtLink to="/quyen-rieng-tu">Quyền riêng tư</NuxtLink></p>
      </fieldset>
    </div>
    <aside class="rd-create__aside" aria-label="Chuyến đi của bạn">
      <div class="rd-create__summary">
        <span class="rd-create__eyebrow">CHUYẾN ĐI CỦA BẠN</span>
        <h2>{{ request.days }} ngày ở {{ city.name }}</h2>
        <p>{{ TRANSPORT_LABEL[request.transport] }} · {{ TRIP_WITH_LABEL[request.with] }}<br>{{ PACE_LABEL[request.pace] }}</p>
        <p>{{ interestSummary }}</p>
        <div v-if="error" ref="notice" class="rd-create__notice" tabindex="-1" role="alert">
          <p>{{ error.message }}</p>
          <button v-for="(suggestion, index) in error.suggestions" :key="index" type="button" class="rd-btn rd-btn--outline" :disabled="pending" @click="apply(suggestion)">{{ suggestionLabel(suggestion) }}</button>
        </div>
        <button type="submit" class="rd-btn rd-create__submit" :disabled="pending">{{ pending ? 'Đang xếp lịch cho bạn…' : error?.kind === 'network' ? 'Thử lại' : 'Lên lịch giúp mình' }} <span v-if="!pending" aria-hidden="true">↗</span></button>
        <div v-if="pending" class="rd-create__skeleton" role="status"><p>Mình đang nối các điểm ghé thành một chuyến đi…</p><span /><span /><span /></div>
        <p class="rd-create__footnote">Không cần đăng nhập. Lịch tạo xong sẽ có đường dẫn riêng để bạn gửi người đi cùng.</p>
      </div>
    </aside>
    <noscript><p>Bạn cần bật JavaScript để chọn và tạo lịch trình. Trong lúc chờ, hãy <NuxtLink :to="`/${city.slug}#lich-trinh`">xem lịch trình có sẵn</NuxtLink>.</p></noscript>
  </form>
</template>

<style scoped>
.rd-create { display: grid; gap: var(--space-8); align-items: start; }
.rd-create__steps { min-width: 0; }
.rd-create__step { min-width: 0; padding: var(--space-6) 0; margin: 0; border: 0; border-bottom: 1px solid var(--line); }
.rd-create__step legend { display: flex; align-items: baseline; gap: var(--space-3); width: 100%; padding: 0; font: 700 21px/1.5 var(--font-display-vietnamese); color: var(--ink); }
.rd-create__step legend > span { font: 12px var(--font-coordinate); color: var(--route-rust); }
.rd-create__choices { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
.rd-create__choices button { min-width: var(--tap-min); min-height: var(--tap-min); padding: var(--space-3) var(--space-4); border: var(--border); border-radius: var(--radius-chip); background: var(--paper-raised); color: var(--ink); font: 400 13px/1.6 var(--font-body); cursor: pointer; }
.rd-create__choices button[aria-pressed='true'] { border-color: var(--selected-border); background: var(--selected-surface); color: var(--selected-foreground); box-shadow: inset 0 0 0 1px var(--selected-border); }
.rd-create__choices button:disabled, .rd-create__submit:disabled { background: var(--disabled-surface); color: var(--disabled-foreground); border-color: var(--disabled-border); cursor: default; }
.rd-create__days { flex-wrap: nowrap; }
.rd-create__days button { flex: 1; display: grid; justify-items: center; padding-inline: var(--space-2); }
.rd-create__days b { font: 700 26px var(--font-display); }
.rd-create__days span { font-size: 11px; }
.rd-create__hint { display: block; margin: var(--space-3) 0; color: var(--ink-soft); font-size: 13px; line-height: 1.8; }
.rd-create__step input[type='date'] { display: block; width: 100%; max-width: 320px; min-height: var(--button-height); box-sizing: border-box; padding: var(--space-3); background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-chip); color: var(--ink); font: 400 16px var(--font-body); }
.rd-create__count, .rd-create__privacy, .rd-create__footnote { color: var(--ink-soft); font-size: 12px; line-height: 1.9; }
.rd-create__privacy a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-create__map { margin-top: var(--space-5); }
.rd-create__summary { padding: var(--space-6); background: var(--paper-raised); background-image: var(--paper-grain); border: var(--border); border-radius: var(--radius-postcard); box-shadow: var(--shadow-postcard); }
.rd-create__eyebrow { color: var(--route-rust); font: 11px/1.8 var(--font-coordinate); }
.rd-create__summary h2 { font: 700 30px/1.4 var(--font-display-vietnamese); margin: var(--space-4) 0; overflow-wrap: anywhere; }
.rd-create__summary > p { font-size: 13px; line-height: 1.9; }
.rd-create__submit { width: 100%; display: flex; justify-content: space-between; gap: var(--space-3); height: auto; min-height: var(--button-height); margin-top: var(--space-6); white-space: normal; }
.rd-create__notice { background: var(--note); border-left: 3px solid var(--note-edge); padding: var(--space-4); color: var(--ink); font-size: 13px; line-height: 1.8; }
.rd-create__notice p { margin-top: 0; }
.rd-create__notice button { width: 100%; margin-top: var(--space-2); height: auto; min-height: var(--tap-min); white-space: normal; }
.rd-create :is(button, input, a, [tabindex]):focus-visible { outline: 3px solid var(--brand-primary); outline-offset: 3px; }
.rd-create__skeleton { font-size: 13px; line-height: 1.8; }
.rd-create__skeleton span { display: block; height: 24px; margin-top: var(--space-3); border-radius: var(--radius-note); background: var(--mist); }
.rd-create__skeleton span:nth-of-type(2) { width: 80%; }
@media (min-width: 900px) { .rd-create { grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: var(--space-16); } .rd-create__aside { position: sticky; top: var(--space-6); padding-top: var(--space-6); } }
@media (prefers-reduced-motion: no-preference) { .rd-create__skeleton span { animation: rd-create-pulse 1.4s ease-in-out infinite alternate; } @keyframes rd-create-pulse { to { opacity: 0.4; } } }
</style>
