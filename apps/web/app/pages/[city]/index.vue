<script setup lang="ts">
import { useApiBase, type HealthResponse } from '~/shared/api/client';

const CITIES = ['da-lat'];
definePageMeta({
  validate: (route) => CITIES.includes(String(route.params.city)),
});

useHead({ title: 'Đà Lạt hôm nay ghé đâu? · Rành Đường' });

const { data: health } = await useFetch<HealthResponse>(`${useApiBase()}/health`, { server: false });
</script>

<template>
  <main class="page">
    <h1 class="title">Đà Lạt hôm nay<br />ghé đâu?</h1>
    <p class="lead">Ghi chép của người rành đường. Quán nào cũng được hỏi lại trước khi lên đây.</p>
    <p class="note">Bộ khung đã chạy. Trang thật làm ở story S09.</p>
    <p class="status">API: {{ health ? `${health.status}, DB ${health.db}` : 'chưa kết nối' }}</p>
  </main>
</template>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: 32px var(--page-gutter); display: flex; flex-direction: column; gap: 16px; }
.title { margin: 0; font-family: var(--font-display); font-size: 32px; line-height: 1.15; }
.lead { margin: 0; color: var(--ink-soft); line-height: 1.5; }
.note { margin: 0; padding: 14px 16px; background: var(--note); border-radius: var(--radius-note); box-shadow: 0 2px 0 var(--note-edge); transform: rotate(-1deg); font-family: var(--font-hand); font-size: 19px; }
.status { margin: 0; font-size: 13px; color: var(--ink-soft); }
</style>
