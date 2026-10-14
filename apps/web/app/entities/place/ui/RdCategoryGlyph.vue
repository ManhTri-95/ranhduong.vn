<script setup lang="ts">
import type { PlaceCategory } from '@ranhduong/contracts';
import { CATEGORY_GLYPH } from '../lib/map-pin';

// Nét vẽ danh mục, cùng nguồn với ghim bản đồ; chỉ để trang trí nên ẩn với trình đọc màn hình.
defineProps<{ category: PlaceCategory }>();
</script>

<template>
  <svg class="rd-place__glyph" viewBox="5 4 26 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-for="(shape, index) in CATEGORY_GLYPH[category]" :key="index">
      <circle v-if="shape.kind === 'circle'" :cx="shape.cx" :cy="shape.cy" :r="shape.r" />
      <path v-else :d="shape.d" />
    </template>
  </svg>
</template>
