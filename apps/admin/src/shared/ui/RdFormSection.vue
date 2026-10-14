<script setup lang="ts">
defineProps<{ id: string; title: string; badge?: 'ok' | 'missing'; hint?: string; collapsible?: boolean }>();
const open = defineModel<boolean>('open', { default: true });
</script>

<template>
  <section :id="id" class="rd-admin-section rd-admin-form-section" :aria-labelledby="`${id}-title`">
    <div class="rd-admin-form-section__head">
      <h2 :id="`${id}-title`" class="rd-admin-section__title" tabindex="-1" data-section-title>
        <button v-if="collapsible" type="button" class="rd-admin-form-section__toggle" :aria-expanded="open" :aria-controls="`${id}-body`" @click="open = !open">
          {{ title }}
        </button>
        <template v-else>{{ title }}</template>
      </h2>
      <span v-if="hint" class="rd-quiet">{{ hint }}</span>
      <span v-if="badge" :class="['rd-status', badge === 'ok' ? 'rd-status--ok' : 'rd-status--warn']">{{ badge === 'ok' ? 'Đủ' : 'Còn thiếu' }}</span>
    </div>
    <p v-if="collapsible && !open && $slots.summary" class="rd-admin-form-section__summary"><slot name="summary" /></p>
    <div v-show="!collapsible || open" :id="`${id}-body`" class="rd-admin-form-section__body"><slot /></div>
  </section>
</template>
