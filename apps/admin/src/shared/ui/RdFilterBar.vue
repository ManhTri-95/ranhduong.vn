<script setup lang="ts">
defineProps<{ label: string; active: boolean }>();
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <div class="rd-admin-filters" role="search" :aria-label="label">
    <div class="rd-admin-filters__fields"><slot /></div>
    <button v-if="active" type="button" class="rd-btn rd-btn--ghost" @click="emit('clear')">Xoá bộ lọc</button>
  </div>
</template>
