<script setup lang="ts">
import type { AdminPlaceSummary } from '@ranhduong/contracts';
import { RouterLink } from 'vue-router';
import type { PlaceAction } from '@/features/place-status/model/actions';

defineProps<{ place: AdminPlaceSummary; primary: PlaceAction }>();
const emit = defineEmits<{ primary: [action: PlaceAction]; menu: [] }>();
</script>

<template>
  <div class="rd-admin-row-actions">
    <RouterLink v-if="primary.kind === 'edit'" class="rd-btn rd-btn--outline" :to="`/dia-diem/${place.id}`">{{ primary.label }}</RouterLink>
    <button v-else type="button" class="rd-btn rd-btn--outline" @click="emit('primary', primary)">{{ primary.label }}</button>
    <button type="button" class="rd-icon-btn" :aria-label="`Thao tác khác: ${place.name}`" @click="emit('menu')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    </button>
  </div>
</template>
