<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type HealthResponse } from '@/shared/api/client';

const health = ref<HealthResponse | null>(null);
onMounted(async () => {
  try { health.value = await api<HealthResponse>('/health'); } catch { health.value = null; }
});
</script>

<template>
  <h1 style="margin: 0; font-family: var(--font-display); font-size: 28px">Địa điểm</h1>
  <p style="color: var(--ink-soft)">Khung admin đã chạy. Danh sách thật làm ở story S07.</p>
  <p style="font-size: 13px; color: var(--ink-soft)">API: {{ health ? `${health.status}, DB ${health.db}` : 'chưa kết nối' }}</p>
</template>
