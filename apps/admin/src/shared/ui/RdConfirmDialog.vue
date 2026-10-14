<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { answerConfirm, confirmState } from '../lib/confirm';

const dialog = ref<HTMLDialogElement | null>(null);
const request = confirmState;

// Có lời hỏi thì mở; hết hàng thì đóng. Còn lời hỏi kế tiếp thì giữ hộp mở, đổi nội dung.
watch(confirmState, async (value) => {
  await nextTick();
  const el = dialog.value;
  if (!el) return;
  if (value && !el.open) el.showModal();
  if (!value && el.open) el.close();
});

/** Esc hoặc đóng theo cách khác khi còn lời hỏi: coi như Huỷ. */
function onClose(): void {
  if (confirmState.value) answerConfirm(false);
}
</script>

<template>
  <dialog ref="dialog" class="rd-admin-dialog" aria-labelledby="rd-confirm-title" aria-describedby="rd-confirm-body" @close="onClose">
    <template v-if="request">
      <h2 id="rd-confirm-title">{{ request.title }}</h2>
      <p id="rd-confirm-body">{{ request.body }}</p>
      <div class="rd-admin-dialog__actions">
        <button type="button" class="rd-btn rd-btn--outline" autofocus @click="answerConfirm(false)">{{ request.cancelLabel ?? 'Huỷ' }}</button>
        <button type="button" :class="['rd-btn', request.tone === 'danger' ? 'rd-btn--danger' : 'rd-btn--primary']" @click="answerConfirm(true)">
          {{ request.confirmLabel }}
        </button>
      </div>
    </template>
  </dialog>
</template>
