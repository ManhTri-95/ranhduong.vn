<script setup lang="ts">
import { computed } from 'vue';
import type { ChecklistItem } from '../model/checklist';

const props = defineProps<{ items: readonly ChecklistItem[]; draft: boolean; headingId: string; listId?: string }>();
const emit = defineEmits<{ go: [target: string] }>();
const missing = computed(() => props.items.filter((item) => !item.ok).length);
const title = computed(() => {
  if (missing.value === 0) return props.draft ? 'Đủ điều kiện kích hoạt' : 'Đủ điều kiện hiển thị';
  return props.draft ? `Còn thiếu ${missing.value} điều kiện để kích hoạt` : `Còn thiếu ${missing.value} điều kiện để giữ hiển thị`;
});
</script>

<template>
  <section class="rd-admin-section" :aria-labelledby="headingId">
    <h2 :id="headingId" class="rd-admin-card-title">{{ title }}</h2>
    <ul :id="listId" class="rd-admin-checklist">
      <li v-for="item in items" :key="item.code">
        <a :href="`#${item.target}`" @click.prevent="emit('go', item.target)">
          <span :class="['rd-admin-checklist__mark', item.ok ? 'is-ok' : 'is-missing']" aria-hidden="true">{{ item.ok ? '✓' : '✗' }}</span>
          <span>{{ item.label }}<span class="rd-sr-only">{{ item.ok ? ': đủ' : ': còn thiếu' }}</span></span>
        </a>
        <ul v-if="item.messages.length > 0" class="rd-admin-checklist__details">
          <li v-for="message in item.messages" :key="message">{{ message }}</li>
        </ul>
      </li>
    </ul>
  </section>
</template>
