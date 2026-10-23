<script setup lang="ts">
const props = withDefaults(defineProps<{ target: string; label?: string }>(), { label: 'Đến nội dung chính' });
function focusContent(event: MouseEvent): void {
  const target = document.getElementById(props.target);
  if (!target) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start', behavior: 'instant' });
}
</script>

<template><a class="rd-skip-link" :href="`#${target}`" @click="focusContent">{{ label }}</a></template>

<style scoped>
.rd-skip-link { position: absolute; top: var(--space-2); left: var(--space-5); z-index: 100; max-width: calc(100% - 40px); padding: var(--space-3) var(--space-4); min-height: var(--tap-min); background: var(--paper-raised); color: var(--ink); border: var(--border-ink); border-radius: var(--radius-note); transform: translateY(-200%); }
.rd-skip-link:focus { transform: none; }
</style>
