<script setup lang="ts">
import { CATEGORY_LABEL, openStatus, type PlaceCard } from '@ranhduong/contracts';
import { computed } from 'vue';
import { placeStatusText } from '~/entities/place/lib/open-status-text';
import RdCollectionPhoto from './RdCollectionPhoto.vue';

const props = defineProps<{ place: PlaceCard; index: number; citySlug: string; now: Date | null; selected: boolean }>();
defineEmits<{ focusMap: [slug: string] }>();
const status = computed(() => placeStatusText(props.now ? openStatus(props.place.openingHours, props.now) : { kind: 'unknown' }, props.place.unconfirmed));
const href = computed(() => `/${props.citySlug}/dia-diem/${props.place.slug}`);
const alsoCategories = computed(() => props.place.alsoCategories?.map(category => CATEGORY_LABEL[category]).join(', '));
</script>

<template>
  <article :id="`collection-place-${place.slug}`" :class="['rd-journal-place', { 'rd-journal-place--selected': selected }]" data-rd-route-scene :aria-labelledby="`collection-name-${place.slug}`">
    <div class="rd-journal-place__marker" aria-hidden="true"><span class="rd-curated-page__rank">{{ String(index + 1).padStart(2, '0') }}</span><svg viewBox="0 0 8 100" preserveAspectRatio="none"><path d="M4 0V100" pathLength="1" /></svg></div>
    <NuxtLink :to="href" class="rd-journal-place__photo" :aria-label="`Xem ${place.name}`" tabindex="-1" aria-hidden="true"><RdCollectionPhoto :place="place" /><span class="rd-journal-place__photo-label">RÀNH ĐƯỜNG <span>ĐIỂM {{ String(index + 1).padStart(2, '0') }}</span></span></NuxtLink>
    <div class="rd-journal-place__body">
      <p class="rd-journal-place__meta">{{ CATEGORY_LABEL[place.category] }}<template v-if="place.zoneName"><span aria-hidden="true"> / </span>{{ place.zoneName }}</template></p>
      <h3 :id="`collection-name-${place.slug}`"><NuxtLink :to="href">{{ place.name }}</NuxtLink></h3>
      <p v-if="place.note" class="rd-journal-place__note">{{ place.note }}</p>
      <div class="rd-journal-place__practical">
        <p v-if="status.chip || status.text"><span v-if="status.chip" :class="['rd-journal-place__open', { 'rd-journal-place__open--accent': status.accent }]">{{ status.chip }}</span> {{ status.text }}</p>
        <p v-if="alsoCategories">Cũng có: {{ alsoCategories }}</p>
        <p v-if="status.caveat" class="rd-journal-place__caveat">{{ status.caveat }}</p>
      </div>
      <div class="rd-journal-place__actions"><NuxtLink :to="href">Ghé xem chi tiết <span aria-hidden="true">↗</span></NuxtLink><button type="button" @click="$emit('focusMap', place.slug)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>Trên bản đồ</button></div>
    </div>
  </article>
</template>

<style scoped>
.rd-journal-place { position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr); column-gap: var(--space-3); padding-bottom: var(--space-10); min-width: 0; scroll-margin-top: var(--space-6); }
.rd-journal-place__marker { grid-column: 1; grid-row: 1 / 3; position: relative; display: flex; justify-content: center; }
.rd-curated-page__rank { z-index: 1; display: grid; place-items: center; width: 32px; height: 32px; background: var(--paper); border: 1px solid var(--ink); border-radius: var(--radius-pill); font: 600 12px/1 var(--font-coordinate); }
.rd-journal-place__marker svg { position: absolute; width: 8px; height: calc(100% + 40px); top: 32px; color: var(--line); }
.rd-journal-place__marker path { stroke: currentColor; stroke-width: 1.5; fill: none; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--rd-route-progress, 1)); }
.rd-journal-place__photo { display: block; min-width: 0; color: var(--ink-soft); padding: var(--space-2); background: var(--paper-raised); box-shadow: var(--shadow-postcard); text-decoration: none; border-radius: var(--radius-postcard); transition: transform var(--dur-standard) var(--ease-out); }
.rd-journal-place__photo-label { display: flex; justify-content: space-between; gap: var(--space-2); padding: var(--space-3) var(--space-1) var(--space-1); font: 500 8px/1.5 var(--font-coordinate); letter-spacing: .08em; }
.rd-journal-place__body { grid-column: 2; min-width: 0; padding-top: var(--space-6); overflow-wrap: anywhere; }
.rd-journal-place__meta { margin: 0 0 var(--space-3); color: var(--route-rust); font: 600 10px/1.8 var(--font-body); letter-spacing: .08em; text-transform: uppercase; }
.rd-journal-place__meta span { padding: 0 var(--space-1); color: var(--line); }
.rd-journal-place h3 { margin: 0; font: 700 clamp(25px, 3vw, 38px)/1.3 var(--font-display-vietnamese); letter-spacing: -.035em; }
.rd-journal-place h3 a { display: inline-block; min-height: var(--tap-min); text-decoration: none; }
.rd-journal-place__note { margin: var(--space-5) 0 0; max-width: 42ch; font: 400 15px/1.85 var(--font-body); color: var(--ink-soft); white-space: pre-line; }
.rd-journal-place__practical { margin-top: var(--space-5); font: 400 var(--text-utility)/1.8 var(--font-body); color: var(--ink-soft); }
.rd-journal-place__practical:empty { display: none; }
.rd-journal-place__practical p { margin: var(--space-1) 0; }
.rd-journal-place__open { display: inline-block; padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-pill); }
.rd-journal-place__open--accent { background: var(--status-ok-bg); color: var(--status-ok); border-color: var(--status-ok); }
.rd-journal-place__caveat { font-style: italic; }
.rd-journal-place__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-5); margin-top: var(--space-5); }
.rd-journal-place__actions a, .rd-journal-place__actions button { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: var(--tap-min); color: var(--ink); font: 600 var(--text-utility)/1.6 var(--font-body); text-decoration: none; background: transparent; border: 0; border-bottom: 1px solid var(--line); padding: 0; cursor: pointer; }
.rd-journal-place__actions a span { font-size: 20px; }
.rd-journal-place__actions button { color: var(--ink-soft); border-bottom-color: transparent; }
.rd-journal-place__actions svg { width: 16px; height: 16px; flex-shrink: 0; }
.rd-journal-place--selected .rd-curated-page__rank { background: var(--selected-surface); border-color: var(--selected-foreground); box-shadow: 0 0 0 4px var(--selected-surface);  color: var(--selected-foreground);}
.rd-journal-place--selected h3 { text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: .2em; }
@media (min-width: 768px) { .rd-journal-place { grid-template-columns: 44px minmax(0, 1.05fr) minmax(0, 1fr); gap: var(--space-6); padding-bottom: var(--space-16); align-items: center; } .rd-journal-place__marker { align-self: stretch; grid-row: 1; } .rd-curated-page__rank { width: 44px; height: 44px; font-size: 15px; } .rd-journal-place__marker svg { top: 44px; height: calc(100% + 64px); } .rd-journal-place__body { grid-column: 3; padding: 0; } .rd-journal-place__photo-label { font-size: 9px; } }
@media (min-width: 1280px) { .rd-journal-place { column-gap: var(--space-12); } .rd-journal-place__body { padding-right: var(--space-10); } }
@media (hover: hover) and (prefers-reduced-motion: no-preference) { .rd-journal-place__photo:hover { transform: translateY(-4px) rotate(-.5deg); } .rd-journal-place__actions a:hover { border-color: var(--ink); } }
</style>
