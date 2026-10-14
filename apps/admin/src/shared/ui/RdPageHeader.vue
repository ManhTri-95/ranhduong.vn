<script setup lang="ts">
import { watch } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { formatDocumentTitle } from '../lib/document-title';

const props = defineProps<{ title: string; crumbs?: { label: string; to: RouteLocationRaw }[] }>();
// Tên tab theo tên trang cụ thể (tên địa điểm, lịch trình); khung trang chỉ đặt tên chung theo route.
watch(
  () => props.title,
  (title) => {
    document.title = formatDocumentTitle(title);
  },
  { immediate: true },
);
</script>

<template>
  <header class="rd-admin-header">
    <nav v-if="crumbs?.length" class="rd-admin-crumbs" aria-label="Đường dẫn">
      <ol>
        <li v-for="crumb in crumbs" :key="crumb.label"><RouterLink :to="crumb.to">{{ crumb.label }}</RouterLink></li>
        <li aria-current="page">{{ title }}</li>
      </ol>
    </nav>
    <div class="rd-admin-header__row">
      <div class="rd-admin-header__title">
        <h1 data-rd-page-title tabindex="-1">{{ title }}</h1>
        <slot name="status" />
      </div>
      <div v-if="$slots.actions" class="rd-admin-header__actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.meta" class="rd-admin-header__meta"><slot name="meta" /></div>
  </header>
</template>
