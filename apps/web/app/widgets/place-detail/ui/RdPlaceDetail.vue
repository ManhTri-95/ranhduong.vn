<script setup lang="ts">
import { BEST_TIME_LABEL, CATEGORY_LABEL, COVER_LABEL, PLACE_TRANSPORT_LABEL, tagLabel, verificationStale, type PlaceDetailResponse } from '@ranhduong/contracts';
import { computed } from 'vue';
import { directionHref, verificationDate } from '~/entities/place/lib/place-detail';
import RdOpeningHours from '~/entities/place/ui/RdOpeningHours.vue';
import RdPlaceGallery from '~/entities/place/ui/RdPlaceGallery.vue';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';

const props = defineProps<{ detail: PlaceDetailResponse; citySlug: string; now: Date | null }>();
const place = computed(() => props.detail.place);
const directions = computed(() => directionHref(place.value));
const stale = computed(() => props.now ? verificationStale(place.value.lastVerifiedAt, props.now) : false);
const verifiedOn = computed(() => verificationDate(place.value.lastVerifiedAt));
const categories = computed(() => [place.value.category, ...place.value.alsoCategories].map((c) => CATEGORY_LABEL[c]).join(', '));
</script>

<template>
  <article class="rd-detail">
    <div class="rd-detail__content">
      <RdPlaceGallery :photos="place.photos" :name="place.name" />
      <header class="rd-detail__intro">
        <p class="rd-detail__eyebrow">{{ categories }}<template v-if="place.zoneName"> · <NuxtLink :to="`/${citySlug}/khu-vuc/${place.zoneSlug}`">{{ place.zoneName }}</NuxtLink></template></p>
        <h1 class="page-title">{{ place.name }}</h1>
        <p v-if="place.address" class="lead">{{ place.address }}</p>
        <div class="rd-detail__chips">
          <span v-for="tag in place.tags" :key="tag" class="rd-chip">{{ tagLabel(tag) }}</span>
          <span v-if="place.cover" class="rd-chip">{{ COVER_LABEL[place.cover] }}</span>
          <span v-if="place.priceLevel" class="rd-chip" :aria-label="`Mức giá ${place.priceLevel} trên 4`">{{ '₫'.repeat(place.priceLevel) }}</span>
          <span v-if="place.visitDurationMin" class="rd-chip">Ghé khoảng {{ place.visitDurationMin }} phút</span>
          <span v-for="time in place.bestTime" :key="time" class="rd-chip">{{ BEST_TIME_LABEL[time] }}</span>
          <span v-for="transport in place.transport" :key="transport" class="rd-chip">{{ PLACE_TRANSPORT_LABEL[transport] }}</span>
        </div>
        <p v-if="place.status === 'closed'" class="rd-detail__notice"><strong>Đã đóng cửa.</strong> Mình giữ lại ghi chép này để bạn khỏi ghé nhầm. Xem các chỗ tương tự bên dưới nhé.</p>
        <p v-if="place.unconfirmed" class="rd-detail__notice">Thông tin chưa được quán xác nhận</p>
        <p v-if="stale" class="rd-detail__notice" role="status">{{ verifiedOn ? 'Đã hơn 90 ngày chưa xác minh lại.' : 'Thông tin chưa được xác minh.' }} Gọi quán trước khi ghé nhé.</p>
        <p class="empty-note">{{ verifiedOn ? `Xác minh lần cuối: ${verifiedOn}` : 'Chưa có ngày xác minh' }}</p>
      </header>

      <RdOpeningHours :place="place" :now="now" />
      <section v-if="place.practicalNotes" class="rd-note" aria-labelledby="practical-notes-title">
        <h2 id="practical-notes-title" class="rd-note__label">Người địa phương nói</h2>
        <p class="rd-note__text rd-detail__notes">{{ place.practicalNotes }}</p>
      </section>
      <section class="rd-detail__nearby" aria-labelledby="nearby-title">
        <h2 id="nearby-title" class="section-title">{{ place.status === 'closed' ? 'Chỗ tương tự gần đây' : 'Tiện đường ghé thêm' }}</h2>
        <RdPlaceList v-if="detail.nearby.length" :places="detail.nearby" :city-slug="citySlug" :now="now" />
        <p v-else class="empty-note">Mình chưa ghi chép thêm chỗ gần đây. <NuxtLink :to="`/${citySlug}`">Về xem các chỗ trong thành phố nhé.</NuxtLink></p>
      </section>
    </div>
    <aside class="rd-detail__actions" aria-label="Chỉ đường và liên hệ">
      <div class="rd-action-bar rd-detail__action-bar">
        <a v-if="directions" class="rd-btn rd-btn--accent" :href="directions" target="_blank" rel="noopener noreferrer">Chỉ đường</a>
        <a v-if="place.contact.phone" class="rd-btn rd-btn--outline" :href="`tel:${place.contact.phone}`">Gọi quán</a>
        <a v-if="place.contact.fanpage" class="rd-btn rd-btn--outline" :href="place.contact.fanpage" target="_blank" rel="noopener noreferrer">Fanpage</a>
        <a v-if="place.contact.website" class="rd-btn rd-btn--outline" :href="place.contact.website" target="_blank" rel="noopener noreferrer">Website</a>
        <p v-if="!directions && !Object.keys(place.contact).length" class="empty-note">{{ place.status === 'closed' ? 'Địa điểm đã đóng cửa' : 'Thông tin liên hệ đang cập nhật' }}</p>
      </div>
    </aside>
  </article>
</template>

<style scoped>
.rd-detail { display: grid; gap: var(--space-6); padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }
.rd-detail__content, .rd-detail__intro, .rd-detail__nearby { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-detail__content { gap: var(--space-6); }
.rd-detail__eyebrow { margin: 0; color: var(--ink-soft); font-size: 14px; line-height: 1.6; }
.rd-detail__eyebrow a { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-detail__chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-detail__notice { padding: var(--space-3) var(--space-4); margin: 0; background: var(--note); border-radius: var(--radius-card); line-height: 1.6; }
.rd-detail__notes { white-space: pre-line; margin: 0; overflow-wrap: anywhere; }
.rd-detail__action-bar { position: fixed; z-index: 10; inset: auto 0 0; flex-wrap: wrap; padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px)); }
.rd-detail__action-bar .rd-btn { flex: 1 1 auto; padding-inline: var(--space-4); }
@media (min-width: 1024px) {
  .rd-detail { grid-template-columns: minmax(0, 1fr) 300px; align-items: start; padding-bottom: 0; }
  .rd-detail__actions { position: sticky; top: var(--space-6); }
  .rd-detail__action-bar { position: static; flex-direction: column; align-items: stretch; border: var(--border); border-radius: var(--radius-card); padding: var(--space-5); }
}
</style>
