<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { answerConfirm, confirmState } from '../lib/confirm';

const dialog = ref<HTMLDialogElement | null>(null);
const request = confirmState;
/** Hộp tự đóng (hết hàng hỏi): sự kiện close sau đó không được coi là Huỷ của lời hỏi kế tiếp. */
let closingSelf = false;

// Có lời hỏi thì mở; hết hàng thì đóng. Còn lời hỏi kế tiếp thì giữ hộp mở, đổi nội dung và đưa focus về nút Huỷ.
watch(confirmState, async () => {
  await nextTick();
  const el = dialog.value;
  if (!el) return;
  const current = confirmState.value;
  if (current && !el.open) el.showModal();
  else if (current) el.querySelector<HTMLButtonElement>('[data-confirm-cancel]')?.focus();
  else if (el.open) {
    closingSelf = true;
    el.close();
  }
});

/** Esc: coi như Huỷ; hộp đóng qua watcher khi hết hàng. */
function onCancel(): void {
  answerConfirm(false);
}
/** Trình duyệt tự đóng hộp (không qua watcher) khi còn lời hỏi: coi như Huỷ để hàng không bị kẹt. */
function onClose(): void {
  if (closingSelf) {
    closingSelf = false;
    return;
  }
  if (confirmState.value) answerConfirm(false);
}
</script>

<template>
  <dialog ref="dialog" class="rd-admin-dialog" aria-labelledby="rd-confirm-title" aria-describedby="rd-confirm-body" @cancel.prevent="onCancel" @close="onClose">
    <template v-if="request">
      <h2 id="rd-confirm-title">{{ request.title }}</h2>
      <p id="rd-confirm-body">{{ request.body }}</p>
      <div class="rd-admin-dialog__actions">
        <button type="button" class="rd-btn rd-btn--outline" autofocus data-confirm-cancel @click="answerConfirm(false)">{{ request.cancelLabel ?? 'Huỷ' }}</button>
        <button type="button" :class="['rd-btn', request.tone === 'danger' ? 'rd-btn--danger' : 'rd-btn--primary']" @click="answerConfirm(true)">
          {{ request.confirmLabel }}
        </button>
      </div>
    </template>
  </dialog>
</template>
