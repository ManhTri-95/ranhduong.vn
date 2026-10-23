<script setup lang="ts">
import { formatTripLength, type ItineraryCard, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { fetchTemplateDetail } from '~/entities/itinerary/api/itineraries';
import { journalPreview } from '~/entities/itinerary/lib/journal-preview';
import { useApiBase } from '~/shared/api/client';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';

const props = defineProps<{ citySlug: string; itinerary: ItineraryCard | null }>();
const apiBase = useApiBase();
const detail = ref<ItineraryTemplateDetail | null>(null);
const pending = ref(false);
const failed = ref(false);
const loadButton = ref<HTMLButtonElement>();
const previewContent = ref<HTMLElement>();
const stops = computed(() => detail.value ? journalPreview(detail.value) : []);
let version = 0;
let controller: AbortController | undefined;
function reset(): void { version++; controller?.abort(); detail.value = null; pending.value = false; failed.value = false; }
watch(() => props.itinerary?.slug, reset);
onBeforeUnmount(reset);
async function load(): Promise<void> {
  if (!props.itinerary || pending.value) return;
  controller?.abort(); controller = new AbortController();
  const current = ++version;
  pending.value = true; failed.value = false;
  try {
    const result = await fetchTemplateDetail(apiBase, props.citySlug, props.itinerary.slug, controller.signal);
    if (current !== version) return;
    const moveFocus = document.activeElement === loadButton.value;
    detail.value = result;
    await nextTick();
    if (moveFocus) previewContent.value?.focus();
  } catch { if (current === version) failed.value = true; }
  finally { if (current === version) pending.value = false; }
}
</script>

<template>
  <div class="rd-home-itinerary-intro">
    <div class="rd-home-itinerary-intro__story">
      <RdChapterLabel number="06" label="Nối những điểm ghé thành câu chuyện" />
      <h2>Nhặt vài nơi hay.<br><em>Ghép thành<br>một chuyến đi.</em></h2>
      <p class="rd-home-itinerary-intro__lead">Một tách cà phê, một chỗ ăn, một nơi muốn ghé. Bắt đầu với lịch trình đã được biên soạn và xem từng điểm dừng trên bản đồ.</p>
      <a class="rd-home-text-link" href="#itinerary-strip-title">Chọn lịch trình có sẵn ↗</a>
      <div class="rd-home-itinerary-intro__coming"><NuxtLink class="rd-btn" :to="`/${citySlug}/tao-lich-trinh`">Tự tạo lịch trình ↗</NuxtLink><p>Chọn số ngày, gu và nhịp độ. Mình lên lịch riêng cho chuyến đi của bạn.</p></div>
    </div>
    <div class="rd-journal-preview" :aria-busy="pending">
      <div class="rd-journal-preview__top"><span>SỔ HÀNH TRÌNH / RÀNH ĐƯỜNG</span><RdCompass /></div>
      <template v-if="itinerary">
        <span class="rd-journal-preview__label">LỊCH TRÌNH ĐÃ CÔNG KHAI · {{ formatTripLength(itinerary.days) }}</span>
        <h3>{{ detail?.title || itinerary.title }}</h3>
        <div v-if="detail" ref="previewContent" tabindex="-1" class="rd-journal-preview__content">
          <ol v-if="stops.length" class="rd-journal-preview__timeline">
            <li v-for="({ day, stop }, index) in stops" :key="`${day}-${stop.key}`" :style="{ '--rd-stop-index': index }">
              <span class="rd-journal-preview__number" aria-hidden="true">{{ stop.number }}</span>
              <div><span class="rd-journal-preview__time">NGÀY {{ day }} / {{ stop.start }}—{{ stop.end }}</span><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }} ↗</NuxtLink><span v-if="stop.place?.unconfirmed" class="rd-journal-preview__caveat">Thông tin chưa được quán xác nhận</span></div>
            </li>
          </ol>
          <p v-else class="empty-note">Các điểm dừng hiện chưa có đủ thông tin công khai để xem trước.</p>
          <p class="rd-journal-preview__note">Trích các điểm đang hiển thị. Mở lịch trình để xem đầy đủ.</p>
        </div>
        <div v-else class="rd-journal-preview__invitation"><span aria-hidden="true">↳</span><p>Mỗi điểm dừng là một trang.<br>Mở thử một hành trình?</p><button ref="loadButton" class="rd-home-text-link" type="button" :aria-disabled="pending" @click="load">{{ pending ? 'Đang mở sổ…' : failed ? 'Thử mở lại lịch trình' : 'Xem trước hành trình' }} ↗</button><p v-if="failed" class="rd-journal-preview__error" role="alert">Chưa mở được bản xem trước. Bạn vẫn có thể mở lịch trình đầy đủ.</p></div>
        <NuxtLink class="rd-journal-preview__full" :to="`/${citySlug}/lich-trinh/${itinerary.slug}`">Mở lịch trình đầy đủ <span aria-hidden="true">↗</span></NuxtLink>
      </template>
      <p v-else class="rd-journal-preview__empty">Những hành trình đầu tiên đang được ghi lại. Trong lúc chờ, hãy nhặt vài nơi hay trên bản đồ.</p>
      <span class="rd-journal-preview__signature" aria-hidden="true">Đi chậm một chút cũng hay.</span>
    </div>
  </div>
</template>

<style scoped>
.rd-home-itinerary-intro { display: grid; gap: var(--space-10); margin-bottom: var(--space-16); }
.rd-home-itinerary-intro__lead { max-width: 420px; font-size: 14px; line-height: 1.9; color: var(--ink-soft); margin: var(--space-6) 0 var(--space-3); }
.rd-home-itinerary-intro__coming { margin-top: var(--space-6); }
.rd-home-itinerary-intro__coming button { gap: var(--space-3); height: auto; min-height: var(--button-height); padding-block: var(--space-3); color: var(--ink-soft); background: var(--paper); border: 1px dashed var(--ink-soft); border-radius: var(--radius-postcard); cursor: not-allowed; font-size: 13px; }
.rd-home-itinerary-intro__coming button > span { font: 9px var(--font-coordinate); text-transform: uppercase; }
.rd-home-itinerary-intro__coming p { max-width: 360px; margin: var(--space-3) 0 0; font-size: 11px; line-height: 1.8; color: var(--ink-soft); }
.rd-journal-preview { position: relative; align-self: center; min-width: 0; min-height: 440px; padding: var(--space-6); background: var(--paper-raised); background-image: var(--paper-grain); background-size: 4px 4px; border: 1px solid var(--line); border-radius: var(--radius-postcard); box-shadow: var(--shadow-postcard); }
.rd-journal-preview__top { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); padding-bottom: var(--space-4); margin-bottom: var(--space-5); border-bottom: 1px solid var(--line); font: 9px var(--font-coordinate); }
.rd-journal-preview__top :deep(svg) { width: 48px; height: 48px; color: var(--route-rust); }
.rd-journal-preview__label { font: 9px/1.8 var(--font-coordinate); color: var(--ink-soft); }
.rd-journal-preview h3 { font: 700 26px/1.3 var(--font-display); margin: var(--space-3) 0 var(--space-5); }
.rd-journal-preview__invitation { min-height: 180px; display: flex; flex-direction: column; align-items: start; justify-content: center; }
.rd-journal-preview__invitation > span { color: var(--route-rust); font: 52px/1 var(--font-hand); }
.rd-journal-preview__invitation > p { font: 23px/1.3 var(--font-hand); margin: var(--space-3) 0; color: var(--ink-soft); }
.rd-journal-preview__invitation > button { border: 0; padding: 0; background: transparent; color: var(--ink); font-family: var(--font-body); cursor: pointer; }
.rd-journal-preview__invitation > .rd-journal-preview__error { font: 12px/1.7 var(--font-body); }
.rd-journal-preview__timeline { list-style: none; padding: 0; margin: var(--space-6) 0; }
.rd-journal-preview__timeline li { display: flex; gap: var(--space-4); position: relative; padding-bottom: var(--space-6); }
.rd-journal-preview__timeline li:not(:last-child)::before { content: ''; position: absolute; top: 30px; bottom: 0; left: 14px; border-left: 1px dashed var(--route-rust); }
.rd-journal-preview__number { flex: 0 0 29px; height: 29px; display: grid; place-items: center; border: 1px solid var(--route-rust); border-radius: var(--radius-pill); font: 10px var(--font-coordinate); color: var(--route-rust); }
.rd-journal-preview__time { display: block; font: 9px/1.7 var(--font-coordinate); color: var(--ink-soft); }
.rd-journal-preview__timeline a { display: flex; align-items: center; min-height: var(--tap-min); text-decoration: none; font-size: 13px; font-weight: 600; }
.rd-journal-preview__caveat { display: block; font-size: 10px; line-height: 1.6; color: var(--ink-soft); }
.rd-journal-preview__note, .rd-journal-preview__empty { font-size: 12px; line-height: 1.8; color: var(--ink-soft); }
.rd-journal-preview__full { display: flex; align-items: center; justify-content: space-between; min-height: var(--tap-min); padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 12px; font-weight: 600; text-decoration: none; }
.rd-journal-preview__signature { display: block; text-align: right; margin-top: var(--space-5); color: var(--route-rust); font: 22px/1.4 var(--font-hand); }
@media (min-width: 900px) { .rd-home-itinerary-intro { grid-template-columns: 1fr 1fr; align-items: start; gap: var(--space-16); } .rd-journal-preview { padding: var(--space-8); transform: rotate(2deg); } }
@media (prefers-reduced-motion: no-preference) {
  .rd-journal-preview__timeline li { animation: rd-journal-gather var(--dur-route) var(--ease-route) both; animation-delay: calc(var(--rd-stop-index) * 80ms); }
  @keyframes rd-journal-gather { from { opacity: 0.6; transform: translate(20px, -6px) rotate(1deg); } to { opacity: 1; transform: none; } }
}
</style>
