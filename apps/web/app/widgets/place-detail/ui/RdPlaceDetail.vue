<script setup lang="ts">
import { openStatus, tagLabel, verificationStale, type CityPublic, type PlaceDetailResponse } from '@ranhduong/contracts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { placeStatusText } from '~/entities/place/lib/open-status-text';
import { directionHref, verificationDate } from '~/entities/place/lib/place-detail';
import { travelNotes, visitingMoments } from '~/entities/place/lib/place-story';
import RdOpeningHours from '~/entities/place/ui/RdOpeningHours.vue';
import RdPlaceGallery from '~/entities/place/ui/RdPlaceGallery.vue';
import RdPlaceCard from '~/entities/place/ui/RdPlaceCard.vue';
import { observeLivingRoute } from '~/shared/lib/living-route';
import { usePlaceTracking } from '~/shared/lib/use-place-tracking';
import RdChapterLabel from '~/shared/ui/RdChapterLabel.vue';
import RdCompass from '~/shared/ui/RdCompass.vue';
import RdPlaceReveal from './RdPlaceReveal.vue';
import RdPlaceDirections from './RdPlaceDirections.vue';

const props = defineProps<{ detail: PlaceDetailResponse; citySlug: string; city?: CityPublic | null; now: Date | null }>();
const place = computed(() => props.detail.place);
usePlaceTracking(() => place.value.id);
const closed = computed(() => place.value.status === 'closed');
const directions = computed(() => directionHref(place.value));
const phone = computed(() => closed.value ? undefined : place.value.contact.phone);
const stale = computed(() => props.now ? verificationStale(place.value.lastVerifiedAt, props.now) : false);
const verifiedOn = computed(() => verificationDate(place.value.lastVerifiedAt));
// SWR HTML never contains a cached open-now claim; the live client clock uses Vietnam time.
const status = computed(() => placeStatusText(props.now ? openStatus(place.value.openingHours, props.now) : { kind: 'unknown' }, place.value.unconfirmed));
const hasContact = computed(() => Boolean(place.value.contact.phone || place.value.contact.fanpage || place.value.contact.website));
const notes = computed(() => travelNotes(place.value));
const moments = computed(() => visitingMoments(place.value));
const nearbyFirst = computed(() => props.detail.nearby.slice(0, 3));
const nearbyMore = computed(() => props.detail.nearby.slice(3));
const hasActionBar = computed(() => !closed.value && Boolean(directions.value || phone.value));
useHead(() => ({ bodyAttrs: { 'data-rd-bottom': hasActionBar.value ? 'action' : undefined } }));
const root = ref<HTMLElement>();
let dispose: (() => void) | undefined;
onMounted(() => { if (root.value) dispose = observeLivingRoute(root.value); });
onBeforeUnmount(() => dispose?.());
</script>

<template>
  <article ref="root" class="rd-place-story">
    <svg class="rd-place-story__thread" viewBox="0 0 40 1000" preserveAspectRatio="none" fill="none" aria-hidden="true"><path pathLength="1000" d="M20 0C-5 90 45 140 20 220S-5 360 20 450 45 570 20 650-5 850 20 1000" /></svg>
    <RdPlaceReveal :place="place" :city-slug="citySlug" :city-name="city?.name ?? ''">
      <p v-if="closed" class="rd-place-story__notice"><strong>Đã đóng cửa.</strong> Mình giữ lại ghi chép này để bạn khỏi ghé nhầm. Xem các chỗ tương tự bên dưới nhé.</p>
      <div v-else class="rd-place-story__status">
        <p v-if="place.openingHours.length" class="rd-place-story__status-line" role="status" aria-live="polite"><span v-if="status.chip" :class="['rd-chip', status.accent ? 'rd-chip--accent' : 'rd-chip--outline']">{{ status.chip }}</span><span v-if="status.text">{{ status.text }}</span></p>
        <p v-if="status.caveat" class="rd-place-story__caveat">ⓘ {{ status.caveat }}</p>
        <p class="rd-place-story__verified">{{ verifiedOn ? `Xác minh lần cuối: ${verifiedOn}` : 'Chưa có ngày xác minh' }}</p>
      </div>
      <p v-if="stale && !closed" class="rd-place-story__notice" role="status">{{ verifiedOn ? 'Đã hơn 90 ngày chưa xác minh lại.' : 'Thông tin chưa được xác minh.' }} Gọi quán trước khi ghé nhé.</p>
    </RdPlaceReveal>

    <nav class="rd-place-story__contents" aria-label="Mục lục ghi chép địa điểm"><span>MỞ TỪNG TRANG</span><a href="#first-impression">Câu chuyện</a><a href="#photo-journal">Ảnh địa điểm</a><a href="#before-you-go">Điều cần biết</a><a v-if="!closed" href="#find-your-way">Đường đến đây</a><a href="#next-turn">Đi tiếp đâu?</a></nav>

    <section id="first-impression" class="rd-story-section rd-place-story__impression" data-rd-route-scene aria-labelledby="impression-title">
      <RdChapterLabel number="02" label="Ấn tượng đầu tiên" />
      <div class="rd-place-story__intro-layout">
        <div><h2 id="impression-title">Có gì <em>hay ở đây?</em></h2><p class="rd-place-story__margin-note">Rẽ một chút.<br>Hay cả chuyến đi.</p><RdCompass /></div>
        <div class="rd-place-story__intro-notes"><span class="rd-story-kicker">GHI CHÉP HIỆN CÓ</span><p v-if="place.practicalNotes" class="rd-place-story__prose">{{ place.practicalNotes }}</p><p v-else class="rd-place-story__prose rd-place-story__muted">Câu chuyện của nơi này đang được bổ sung. Trước mắt, bạn có thể xem ảnh và những thông tin thực tế bên dưới.</p><ul v-if="place.tags.length" class="rd-place-story__tags" aria-label="Đặc điểm được ghi nhận"><li v-for="tag in place.tags" :key="tag" class="rd-chip">{{ tagLabel(tag) }}</li></ul><span class="rd-place-story__signature">Mỗi nơi, một câu chuyện.</span></div>
      </div>
    </section>

    <section id="photo-journal" class="rd-story-section" data-rd-route-scene aria-labelledby="photo-journal-title"><RdChapterLabel number="03" label="Mở cuốn nhật ký ảnh" /><div class="rd-story-heading"><h2 id="photo-journal-title">Những góc nhìn<br><em>của một nơi.</em></h2><p>Ảnh của chính địa điểm này.<br>Để bạn hình dung trước khi lên đường.</p></div><RdPlaceGallery :photos="place.photos" :name="place.name" :category="place.category" /></section>

    <section id="before-you-go" class="rd-story-section" data-rd-route-scene aria-labelledby="before-title">
      <RdChapterLabel number="04" label="Bỏ túi vài điều cần biết" /><div class="rd-story-heading"><h2 id="before-title">Trước khi ghé,<br><em>biết một chút.</em></h2><p>Những ghi chép thực tế,<br>để chuyến đi bớt điều bất ngờ.</p></div>
      <p class="rd-place-story__data-note">{{ closed ? 'Địa điểm đã đóng cửa. Thông tin dưới đây được giữ lại để tham khảo, không phải lời mời ghé thăm.' : place.unconfirmed ? 'Thông tin chưa được quán xác nhận. Bạn nên liên hệ trước khi ghé.' : 'Thông tin theo ghi chép hiện có và có thể thay đổi. Kiểm tra lại trước khi ghé nhé.' }} {{ verifiedOn ? `Xác minh lần cuối: ${verifiedOn}.` : 'Chưa có ngày xác minh.' }}</p>
      <div class="rd-travel-notes">
        <div class="rd-travel-notes__hours"><RdOpeningHours :place="place" :now="now" /></div>
        <section class="rd-travel-note rd-travel-note--address" aria-labelledby="address-note-title"><span class="rd-travel-note__icon" aria-hidden="true">⌖</span><h3 id="address-note-title">Địa chỉ</h3><p>{{ place.address || 'Địa chỉ đang cập nhật' }}</p><NuxtLink v-if="place.zoneName && place.zoneSlug" :to="`/${citySlug}/khu-vuc/${place.zoneSlug}`">{{ place.zoneName }} ↗</NuxtLink><a v-if="!closed" href="#find-your-way">Xem vị trí & sao chép địa chỉ ↓</a></section>
        <section v-for="note in notes" :key="note.key" class="rd-travel-note" :aria-labelledby="`travel-note-${note.key}`"><span class="rd-travel-note__icon" aria-hidden="true">{{ note.key === 'price' ? '₫' : note.key === 'cover' ? '☂' : note.key === 'duration' ? '◷' : '↗' }}</span><h3 :id="`travel-note-${note.key}`">{{ note.label }}</h3><p>{{ note.value }}</p><small>{{ note.detail }}</small></section>
      </div>
      <section class="rd-place-story__contact" aria-labelledby="contact-title"><div><span class="rd-story-kicker">HỎI THÊM TRƯỚC KHI ĐI</span><h3 id="contact-title">Liên hệ</h3></div><ul v-if="hasContact"><li v-if="place.contact.phone"><a :href="`tel:${place.contact.phone}`" data-rd-event="call_click" :data-rd-place-id="place.id"><span>Gọi quán</span><span>{{ place.contact.phone }}</span></a></li><li v-if="place.contact.fanpage"><a :href="place.contact.fanpage" target="_blank" rel="noopener noreferrer" data-rd-event="fanpage_click" :data-rd-place-id="place.id">Fanpage <span aria-hidden="true">↗</span></a></li><li v-if="place.contact.website"><a :href="place.contact.website" target="_blank" rel="noopener noreferrer">Website <span aria-hidden="true">↗</span></a></li></ul><p v-else class="empty-note">{{ closed ? 'Địa điểm đã đóng cửa' : 'Thông tin liên hệ đang cập nhật' }}</p></section>
    </section>

    <section v-if="moments.length" id="right-moment" class="rd-story-section rd-place-story__moments" data-rd-route-scene aria-labelledby="moments-title">
      <RdChapterLabel number="05" label="Mỗi nơi, một khoảnh khắc" /><div class="rd-story-heading"><h2 id="moments-title">Đi lúc nào <em>thì hay?</em></h2><p>Thời điểm có trong ghi chép.<br>Chọn nhịp ghé hợp với bạn.</p></div>
      <ol class="rd-day-timeline"><li v-for="moment in moments" :key="moment.key" :class="{ 'is-recommended': moment.recommended }"><span class="rd-day-timeline__dot" aria-hidden="true">{{ moment.recommended ? '✓' : '·' }}</span><strong>{{ moment.label }}</strong><span>{{ moment.recommended ? 'Có gợi ý ghé' : 'Chưa có gợi ý' }}</span></li></ol>
      <p class="rd-place-story__data-note">{{ place.unconfirmed ? 'Gợi ý thời điểm chưa được quán xác nhận. ' : '' }}Đây không phải giờ mở cửa hay dự báo thời tiết. Kiểm tra lịch hoạt động trước khi ghé nhé.</p>
    </section>

    <RdPlaceDirections v-if="!closed" :place="place" :city="city" :city-slug="citySlug" />

    <section v-if="!closed" id="make-it-your-journey" class="rd-story-section rd-place-story__journey" data-rd-route-scene aria-labelledby="journey-title">
      <RdChapterLabel number="07" label="Một nơi trong chuyến đi của bạn" /><div class="rd-place-story__journey-layout"><div><h2 id="journey-title">Thêm nơi này vào<br><em>chuyến đi của bạn.</em></h2><p>Một điểm ghé hôm nay, một ý tưởng cho chuyến đi tới.</p><p id="place-itinerary-availability" class="rd-place-story__availability">Tính năng thêm địa điểm vào lịch trình cá nhân chưa được mở. Bạn có thể tham khảo các lịch trình đã được Rành Đường biên soạn.</p><div class="rd-place-story__journey-actions"><button type="button" class="rd-btn rd-btn--primary" disabled>Thêm vào lịch trình <small>Sắp có</small></button><NuxtLink class="rd-btn rd-btn--outline" :to="`/${citySlug}#lich-trinh`">Xem lịch trình gợi ý ↗</NuxtLink></div></div><div class="rd-place-story__journey-note"><RdCompass /><span>ĐỂ DÀNH CHO MỘT NGÃ RẼ</span><strong>{{ place.name }}</strong><p>Một nơi đáng nhớ.<br>Một chuyến đi của riêng bạn.</p><svg viewBox="0 0 260 100" fill="none" aria-hidden="true"><path pathLength="1000" d="M10 80C60 80 45 10 105 30S165 100 205 45 240 15 250 20" /><circle cx="250" cy="20" r="5" /></svg><small>Ghi chép địa điểm · Chưa thêm vào lịch trình</small></div></div>
    </section>

    <section id="next-turn" class="rd-story-section" data-rd-route-scene aria-labelledby="nearby-title"><RdChapterLabel number="08" label="Câu chuyện ở ngã rẽ tiếp theo" /><div class="rd-story-heading"><h2 id="nearby-title">Đi tiếp <em>đâu nhỉ?</em></h2><p>{{ closed ? 'Một vài nơi tương tự trong gợi ý của Rành Đường.' : 'Những địa điểm được gợi ý gần đây.' }}</p></div>
      <template v-if="detail.nearby.length"><ul class="rd-place-story__recommendations"><li v-for="item in nearbyFirst" :key="item.slug"><RdPlaceCard :place="item" :href="`/${citySlug}/dia-diem/${item.slug}`" :now="now" /></li></ul><details v-if="nearbyMore.length" class="rd-place-story__more"><summary class="rd-btn rd-btn--outline"><span class="rd-place-story__more-open">Xem thêm gần đây ({{ nearbyMore.length }})</span><span class="rd-place-story__more-close">Thu gọn</span></summary><ul class="rd-place-story__recommendations"><li v-for="item in nearbyMore" :key="item.slug"><RdPlaceCard :place="item" :href="`/${citySlug}/dia-diem/${item.slug}`" :now="now" /></li></ul></details></template><p v-else class="empty-note">Mình chưa ghi chép thêm chỗ gần đây. <NuxtLink :to="`/${citySlug}`">Về xem các chỗ trong thành phố nhé.</NuxtLink></p>
    </section>

    <aside v-if="hasActionBar" class="rd-place-story__action-bar rd-action-bar" aria-label="Hành động cho địa điểm">
      <span class="rd-place-story__action-name">{{ place.name }}</span><button type="button" class="rd-btn rd-btn--outline rd-place-story__add" disabled aria-describedby="place-itinerary-availability">Thêm vào lịch trình <small>Sắp có</small></button>
      <a v-if="directions" class="rd-btn rd-btn--accent" :href="directions" target="_blank" rel="noopener noreferrer" data-rd-event="direction_click" :data-rd-place-id="place.id">Chỉ đường <span aria-hidden="true">↗</span></a>
      <a v-if="phone" class="rd-btn rd-btn--outline rd-place-story__call" :href="`tel:${phone}`" aria-label="Gọi quán" data-rd-event="call_click" :data-rd-place-id="place.id"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></a>
    </aside>
  </article>
</template>

<style src="../../../assets/place-story.css"></style>
