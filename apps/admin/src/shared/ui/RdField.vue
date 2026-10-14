<script setup lang="ts">
import { computed, useId } from 'vue';

const props = defineProps<{ label: string; hint?: string; error?: string; required?: boolean; count?: { value: number; max: number }; group?: boolean }>();
defineSlots<{ default(props: { id: string; describedBy: string | undefined; invalid: boolean }): unknown }>();

const id = useId();
const hintId = `${id}-hint`;
const errorId = `${id}-error`;
/** Gợi ý và lỗi gắn với ô qua aria-describedby (spec S28 mục 7.3). */
const describedBy = computed(() => [props.hint || props.count ? hintId : null, props.error ? errorId : null].filter((part) => part !== null).join(' ') || undefined);
const slotProps = computed(() => ({ id, describedBy: describedBy.value, invalid: Boolean(props.error) }));
</script>

<template>
  <component :is="group ? 'fieldset' : 'div'" class="rd-field" :aria-describedby="group ? describedBy : undefined">
    <legend v-if="group" class="rd-field__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></legend>
    <label v-else :for="id" class="rd-field__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <slot v-bind="slotProps" />
    <p v-if="hint || count" :id="hintId" class="rd-field__hint">
      {{ hint }}<span v-if="count" class="rd-admin-count">{{ count.value }}/{{ count.max }}</span>
    </p>
    <p v-if="error" :id="errorId" class="rd-field__error">{{ error }}</p>
  </component>
</template>
