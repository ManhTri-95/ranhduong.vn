<script setup lang="ts">
defineProps<{ message: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="banner" role="status">
    <p class="banner__text">{{ message }}</p>
    <button class="rd-btn rd-btn--outline" type="button" @click="$emit('retry')">Thử lại</button>
  </div>
</template>

<style scoped>
.banner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--paper-raised); border: var(--border-hair) solid var(--ink); border-radius: var(--radius-card); }
.banner__text { margin: 0; font-size: 14px; line-height: 1.4; }
</style>
