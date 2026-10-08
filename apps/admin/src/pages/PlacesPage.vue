<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api, type HealthResponse } from '@/shared/api/client';

const health = ref<HealthResponse | null>(null);
onMounted(async () => {
  try { health.value = await api<HealthResponse>('/health'); } catch { health.value = null; }
});
</script>

<template>
  <h1 style="margin: 0; font-family: var(--font-display); font-size: 28px">Địa điểm</h1>
  <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
  <p style="color: var(--ink-soft)">Danh sách địa điểm làm ở bước sau; mở một địa điểm đã có bằng đường dẫn /dia-diem/{id}.</p>
  <p style="font-size: 13px; color: var(--ink-soft)">API: {{ health ? `${health.status}, DB ${health.db}` : 'chưa kết nối' }}</p>
</template>
