<script setup lang="ts">
import type { NuxtError } from '#app';
import { computed } from 'vue';

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);
useSeoMeta({ title: () => (notFound.value ? 'Không tìm thấy · Rành Đường' : 'Có lỗi · Rành Đường'), robots: 'noindex' });
</script>

<template>
  <main class="error-page">
    <h1 class="page-title">{{ notFound ? 'Đường này mình chưa đi tới' : 'Có trục trặc một chút' }}</h1>
    <p class="lead">{{ notFound ? 'Trang bạn tìm không có, hoặc đã đổi chỗ.' : 'Máy chủ đang gặp lỗi. Thử lại sau ít phút nhé.' }}</p>
    <a class="rd-btn rd-btn--primary" href="/">Về trang chủ</a>
  </main>
</template>

<style scoped>
.error-page { max-width: 640px; margin: 0 auto; padding: var(--space-7) var(--space-5); display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); }
</style>
