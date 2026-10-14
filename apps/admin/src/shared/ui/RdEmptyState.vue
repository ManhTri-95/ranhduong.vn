<script setup lang="ts">
defineProps<{ kind: 'empty' | 'no-match' | 'error'; title: string; body?: string }>();
</script>

<template>
  <div :class="['rd-admin-empty', `rd-admin-empty--${kind}`]" :role="kind === 'error' ? 'alert' : undefined">
    <p class="rd-admin-empty__title">{{ title }}</p>
    <p v-if="body" class="rd-admin-empty__body">{{ body }}</p>
    <div v-if="$slots.default" class="rd-admin-empty__actions"><slot /></div>
  </div>
</template>
