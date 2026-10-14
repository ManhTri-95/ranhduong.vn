<script setup lang="ts">
import { ref, watch } from 'vue';

defineProps<{ id: string; label: string }>();
const open = defineModel<boolean>('open', { required: true });
const dialog = ref<HTMLDialogElement | null>(null);

watch(open, (value) => {
  const el = dialog.value;
  if (!el) return;
  if (value && !el.open) el.showModal();
  if (!value && el.open) el.close();
});

function close(): void {
  dialog.value?.close();
}
/** Bấm vào nền mờ (chính phần tử dialog, ngoài panel) thì đóng. */
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) close();
}
</script>

<template>
  <dialog :id="id" ref="dialog" class="rd-admin-drawer" :aria-label="label" @close="open = false" @click="onClick">
    <div class="rd-admin-drawer__panel">
      <button type="button" class="rd-icon-btn rd-admin-drawer__close" aria-label="Đóng menu" @click="close">×</button>
      <slot />
    </div>
  </dialog>
</template>
