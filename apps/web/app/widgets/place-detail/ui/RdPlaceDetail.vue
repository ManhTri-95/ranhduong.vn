<script setup lang="ts">
import { BEST_TIME_LABEL, CATEGORY_LABEL, COVER_LABEL, openStatus, PLACE_TRANSPORT_LABEL, tagLabel, verificationStale, type PlaceDetailResponse } from '@ranhduong/contracts';
import { computed } from 'vue';
import { placeStatusText } from '~/entities/place/lib/open-status-text';
import { directionHref, verificationDate } from '~/entities/place/lib/place-detail';
import RdOpeningHours from '~/entities/place/ui/RdOpeningHours.vue';
import RdPlaceGallery from '~/entities/place/ui/RdPlaceGallery.vue';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import { usePlaceTracking } from '~/shared/lib/use-place-tracking';

const props = defineProps<{ detail: PlaceDetailResponse; citySlug: string; now: Date | null }>();
const place = computed(() => props.detail.place);
usePlaceTracking(() => place.value.id);
const closed = computed(() => place.value.status === 'closed');
const directions = computed(() => directionHref(place.value));
const phone = computed(() => (closed.value ? undefined : place.value.contact.phone));
const stale = computed(() => props.now ? verificationStale(place.value.lastVerifiedAt, props.now) : false);
const verifiedOn = computed(() => verificationDate(place.value.lastVerifiedAt));
const categories = computed(() => [place.value.category, ...place.value.alsoCategories].map((c) => CATEGORY_LABEL[c]).join(', '));
// Trạng thái chỉ tính trên trình duyệt (HTML cache SWR); quán chưa xác nhận: chip trung tính kèm lời nhắc.
const status = computed(() => placeStatusText(props.now ? openStatus(place.value.openingHours, props.now) : { kind: 'unknown' }, place.value.unconfirmed));
const hasContact = computed(() => Boolean(place.value.contact.phone || place.value.contact.fanpage || place.value.contact.website));
// Ba chỗ gần đây hiện sẵn; phần còn lại mở bằng "Xem thêm" (vẫn có trong HTML cho máy tìm kiếm và khi tắt JavaScript).
const nearbyFirst = computed(() => props.detail.nearby.slice(0, 3));
const nearbyMore = computed(() => props.detail.nearby.slice(3));
// Thanh đáy chỉ giữ hành động chính: Chỉ đường và Gọi; quán đã đóng thì không có thanh.
const hasActionBar = computed(() => Boolean(directions.value || phone.value));
useHead(() => ({ bodyAttrs: { 'data-rd-bottom': hasActionBar.value ? 'action' : undefined } }));
</script>

<template>
  <article :class="['rd-detail', { 'rd-detail--with-actions': hasActionBar }]">
    <div class="rd-detail__content">
      <RdPlaceGallery :photos="place.photos" :name="place.name" :category="place.category" />
      <header class="rd-detail__intro">
        <p class="rd-detail__eyebrow">{{ categories }}<template v-if="place.zoneName"> · <NuxtLink :to="`/${citySlug}/khu-vuc/${place.zoneSlug}`">{{ place.zoneName }}</NuxtLink></template></p>
        <h1 class="page-title">{{ place.name }}</h1>
        <p v-if="place.address" class="rd-detail__address">{{ place.address }}</p>
        <p v-if="closed" class="rd-detail__notice"><strong>Đã đóng cửa.</strong> Mình giữ lại ghi chép này để bạn khỏi ghé nhầm. Xem các chỗ tương tự bên dưới nhé.</p>
        <div v-else class="rd-detail__status">
          <!-- Giữ chỗ để chip trạng thái hiện ra sau khi hydrate không đẩy nội dung bên dưới. -->
          <p v-if="place.openingHours.length" class="rd-detail__status-line" role="status" aria-live="polite">
            <span v-if="status.chip" :class="['rd-chip', status.accent ? 'rd-chip--accent' : 'rd-chip--outline']">{{ status.chip }}</span>
            <span v-if="status.text">{{ status.text }}</span>
          </p>
          <p v-if="status.caveat" class="rd-detail__caveat">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            {{ status.caveat }}
          </p>
          <p class="rd-detail__verified">{{ verifiedOn ? `Xác minh lần cuối: ${verifiedOn}` : 'Chưa có ngày xác minh' }}</p>
        </div>
        <p v-if="stale" class="rd-detail__notice" role="status">{{ verifiedOn ? 'Đã hơn 90 ngày chưa xác minh lại.' : 'Thông tin chưa được xác minh.' }} Gọi quán trước khi ghé nhé.</p>
        <ul class="rd-detail__chips" aria-label="Đặc điểm">
          <li v-for="tag in place.tags" :key="tag" class="rd-chip">{{ tagLabel(tag) }}</li>
          <li v-if="place.cover" class="rd-chip">{{ COVER_LABEL[place.cover] }}</li>
          <li v-if="place.priceLevel" class="rd-chip"><span aria-hidden="true">{{ '₫'.repeat(place.priceLevel) }}</span><span class="visually-hidden">Mức giá {{ place.priceLevel }} trên 4</span></li>
          <li v-if="place.visitDurationMin" class="rd-chip">Ghé khoảng {{ place.visitDurationMin }} phút</li>
          <li v-for="time in place.bestTime" :key="time" class="rd-chip">{{ BEST_TIME_LABEL[time] }}</li>
          <li v-for="transport in place.transport" :key="transport" class="rd-chip">{{ PLACE_TRANSPORT_LABEL[transport] }}</li>
        </ul>
      </header>

      <section v-if="place.practicalNotes" class="rd-note rd-detail__tip" aria-labelledby="practical-notes-title">
        <h2 id="practical-notes-title" class="rd-note__label rd-detail__tip-label">Người địa phương nói</h2>
        <p class="rd-detail__notes">{{ place.practicalNotes }}</p>
      </section>
      <RdOpeningHours :place="place" :now="now" />
      <section class="rd-detail__contact" aria-labelledby="contact-title">
        <h2 id="contact-title" class="section-title">Liên hệ</h2>
        <ul v-if="hasContact" class="rd-detail__contact-list">
          <li v-if="place.contact.phone"><a :href="`tel:${place.contact.phone}`" data-rd-event="call_click" :data-rd-place-id="place.id"><span>Gọi quán</span><span class="rd-detail__contact-value">{{ place.contact.phone }}</span></a></li>
          <li v-if="place.contact.fanpage"><a :href="place.contact.fanpage" target="_blank" rel="noopener noreferrer" data-rd-event="fanpage_click" :data-rd-place-id="place.id"><span>Fanpage</span><span class="rd-detail__contact-value" aria-hidden="true">↗</span></a></li>
          <li v-if="place.contact.website"><a :href="place.contact.website" target="_blank" rel="noopener noreferrer"><span>Website</span><span class="rd-detail__contact-value" aria-hidden="true">↗</span></a></li>
        </ul>
        <p v-else class="empty-note">{{ closed ? 'Địa điểm đã đóng cửa' : 'Thông tin liên hệ đang cập nhật' }}</p>
      </section>
      <section class="rd-detail__nearby" aria-labelledby="nearby-title">
        <h2 id="nearby-title" class="section-title">{{ closed ? 'Chỗ tương tự gần đây' : 'Tiện đường ghé thêm' }}</h2>
        <template v-if="detail.nearby.length">
          <RdPlaceList :places="nearbyFirst" :city-slug="citySlug" :now="now" compact />
          <details v-if="nearbyMore.length" class="rd-detail__more">
            <summary class="rd-btn rd-btn--outline"><span class="rd-detail__more-open">Xem thêm gần đây ({{ nearbyMore.length }})</span><span class="rd-detail__more-close">Thu gọn</span></summary>
            <RdPlaceList :places="nearbyMore" :city-slug="citySlug" :now="now" compact />
          </details>
        </template>
        <p v-else class="empty-note">Mình chưa ghi chép thêm chỗ gần đây. <NuxtLink :to="`/${citySlug}`">Về xem các chỗ trong thành phố nhé.</NuxtLink></p>
      </section>
    </div>
    <aside v-if="hasActionBar" class="rd-detail__actions" aria-label="Chỉ đường và gọi quán">
      <div class="rd-action-bar rd-detail__action-bar">
        <a v-if="directions" class="rd-btn rd-btn--accent" :href="directions" target="_blank" rel="noopener noreferrer" data-rd-event="direction_click" :data-rd-place-id="place.id">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
          Chỉ đường
        </a>
        <a v-if="phone" class="rd-btn rd-btn--outline rd-detail__call" :href="`tel:${phone}`" data-rd-event="call_click" :data-rd-place-id="place.id">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
          <span class="rd-detail__call-label">Gọi quán</span>
        </a>
      </div>
    </aside>
  </article>
</template>

<style scoped>
.rd-detail { display: grid; gap: var(--space-6); }
.rd-detail__content, .rd-detail__intro, .rd-detail__nearby, .rd-detail__contact { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.rd-detail__content { gap: var(--space-6); }
.rd-detail__intro { gap: var(--space-2); }
.rd-detail__eyebrow { margin: 0; color: var(--ink-soft); font-size: 14px; line-height: 1.6; }
.rd-detail__eyebrow a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-detail__address { margin: 0; color: var(--ink-soft); font-size: 15px; line-height: 1.5; }
.rd-detail__status { display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-2); }
.rd-detail__status-line { min-height: 26px; margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); font-size: 15px; }
.rd-detail__caveat { margin: 0; display: flex; align-items: center; gap: var(--space-2); font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
.rd-detail__caveat svg { flex: 0 0 18px; width: 18px; height: 18px; }
.rd-detail__verified { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
.rd-detail__chips { list-style: none; margin: var(--space-2) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-detail__notice { padding: var(--space-3) var(--space-4); margin: var(--space-2) 0 0; background: var(--note); border-radius: var(--radius-card); line-height: 1.6; }
/* Ghi chú dài đọc bằng chữ nội dung, không xoay; nhãn viết tay giữ chất sổ tay (ui-spec mục 4). */
.rd-detail__tip { transform: none; gap: var(--space-2); }
.rd-detail__tip-label { margin: 0; font: 400 19px/1.3 var(--font-hand); }
.rd-detail__notes { margin: 0; font: 400 16px/1.65 var(--font-body); white-space: pre-line; overflow-wrap: anywhere; max-width: 65ch; }
.rd-detail__contact-list { list-style: none; margin: 0; padding: 0; border-top: var(--border); }
.rd-detail__contact-list a { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: var(--button-height); border-bottom: var(--border); font-weight: 600; text-decoration: none; }
.rd-detail__contact-value { font-weight: 400; color: var(--ink-soft); overflow-wrap: anywhere; }
.rd-detail__more { display: flex; flex-direction: column; }
.rd-detail__more summary { align-self: flex-start; list-style: none; }
.rd-detail__more summary::-webkit-details-marker { display: none; }
.rd-detail__more[open] summary { margin-bottom: var(--space-3); }
.rd-detail__more[open] :deep(.list) { animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-detail__more-close, .rd-detail__more[open] .rd-detail__more-open { display: none; }
.rd-detail__more[open] .rd-detail__more-close { display: inline; }
/* Điện thoại: một hàng duy nhất, Chỉ đường chiếm phần lớn, Gọi là nút tròn có nhãn ẩn cho trình đọc màn hình. */
.rd-detail__action-bar { position: fixed; z-index: 10; inset: auto 0 0; flex-wrap: nowrap; padding: var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom, 0px)); }
.rd-detail__action-bar .rd-btn--accent { flex: 1 1 auto; min-width: 0; }
.rd-detail__call { flex: 0 0 var(--button-height); width: var(--button-height); height: var(--button-height); padding: 0; border-radius: var(--radius-pill); }
.rd-detail__call:only-child { flex: 1 1 auto; width: auto; padding: 0 var(--space-4); }
.rd-detail__call:not(:only-child) .rd-detail__call-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (min-width: 1024px) {
  .rd-detail--with-actions { grid-template-columns: minmax(0, 1fr) 300px; align-items: start; }
  .rd-detail__actions { position: sticky; top: var(--space-6); }
  .rd-detail__action-bar { position: static; flex-direction: column; align-items: stretch; border: var(--border); border-radius: var(--radius-card); padding: var(--space-5); }
  .rd-detail__call, .rd-detail__call:only-child { flex: 0 0 auto; width: auto; height: var(--tap-min); padding: 0 var(--space-4); }
  .rd-detail__call:not(:only-child) .rd-detail__call-label { position: static; width: auto; height: auto; overflow: visible; clip-path: none; }
}
</style>
