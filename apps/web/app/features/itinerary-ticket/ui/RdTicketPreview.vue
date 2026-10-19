<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { canShareTicket, copyTicketLink, loadTicket, shareTicket } from '../lib/ticket';

/** Màn xem trước vé (Spec UI mục 9): tải ảnh story, gửi kèm file qua bảng chia sẻ; không hỗ trợ thì Lưu ảnh, Sao chép link. */
const props = defineProps<{ open: boolean; url: string; fileName: string; title: string; shareUrl: string }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const state = ref<'idle' | 'loading' | 'ready' | 'pending' | 'failed'>('idle');
const imageUrl = ref<string | null>(null);
const file = shallowRef<File | null>(null);
const canShare = ref(false);
const busy = ref(false);
const status = ref('');
const manual = ref(false);
let request = 0;

function release(): void {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = null;
  file.value = null;
}

async function load(): Promise<void> {
  const current = ++request;
  release();
  state.value = 'loading';
  status.value = 'Đang in vé…';
  manual.value = false;
  const result = await loadTicket(props.url, (target) => fetch(target));
  // Đóng hoặc bấm Thử lại trong lúc chờ: bỏ kết quả cũ.
  if (current !== request || !props.open) return;
  if (result.status === 'ready') {
    file.value = new File([result.blob], props.fileName, { type: 'image/png' });
    imageUrl.value = URL.createObjectURL(file.value);
    canShare.value = canShareTicket(file.value, navigator);
    state.value = 'ready';
    status.value = '';
    return;
  }
  state.value = result.status;
  status.value = result.status === 'pending' ? 'Vé đang được in, chờ vài giây rồi bấm Thử lại nhé.' : 'Chưa tải được vé, có thể mạng đang chập chờn.';
}

watch(() => props.open, async (open) => {
  await nextTick();
  const el = dialog.value;
  if (!el) return;
  if (open && !el.open) {
    el.showModal();
    void load();
  } else if (!open && el.open) el.close();
});

/** Esc hoặc Đóng: dialog tự trả focus về nút đã mở. */
function onClose(): void {
  request++;
  release();
  state.value = 'idle';
  busy.value = false;
  if (props.open) emit('update:open', false);
}

async function send(): Promise<void> {
  if (!file.value || busy.value) return;
  busy.value = true;
  const result = await shareTicket(file.value, { title: props.title, url: props.shareUrl }, navigator);
  busy.value = false;
  if (result === 'shared') status.value = 'Đã mở bảng chia sẻ.';
  else if (result === 'cancelled') status.value = 'Đã đóng bảng chia sẻ.';
  else {
    // Máy báo nhận file nhưng gửi lỗi: chuyển sang Lưu ảnh và Sao chép link.
    canShare.value = false;
    status.value = 'Chưa mở được bảng chia sẻ. Bạn lưu ảnh hoặc sao chép link để gửi nhé.';
  }
}

async function copy(): Promise<void> {
  const writeText = navigator.clipboard?.writeText ? (text: string) => navigator.clipboard.writeText(text) : undefined;
  const result = await copyTicketLink(props.shareUrl, writeText);
  manual.value = result === 'manual';
  status.value = result === 'copied' ? 'Đã chép link lịch trình.' : 'Bạn chọn và chép đường dẫn bên dưới nhé.';
}

onBeforeUnmount(() => { request++; release(); });
</script>

<template>
  <dialog ref="dialog" class="rd-ticket" aria-labelledby="ticket-preview-title" @close="onClose">
    <div class="rd-ticket__head">
      <h2 id="ticket-preview-title" class="rd-ticket__title">Vé lịch trình</h2>
      <button type="button" class="rd-icon-btn rd-ticket__close" aria-label="Đóng" @click="emit('update:open', false)">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
    <div class="rd-ticket__frame">
      <img v-if="state === 'ready' && imageUrl" class="rd-ticket__image" :src="imageUrl" :alt="`Vé lịch trình ${title}`">
      <div v-else-if="state === 'loading'" class="rd-skeleton rd-ticket__skeleton" aria-hidden="true" />
    </div>
    <p class="rd-ticket__status" role="status" aria-live="polite">{{ status }}</p>
    <div class="rd-ticket__actions">
      <template v-if="state === 'ready' && imageUrl">
        <button v-if="canShare" type="button" class="rd-btn rd-btn--primary" :disabled="busy" @click="send">Gửi vé</button>
        <template v-else>
          <a class="rd-btn rd-btn--outline" :href="imageUrl" :download="fileName">Lưu ảnh</a>
          <button type="button" class="rd-btn rd-btn--outline" @click="copy">Sao chép link</button>
        </template>
      </template>
      <button v-else-if="state === 'pending' || state === 'failed'" type="button" class="rd-btn rd-btn--primary" @click="load">Thử lại</button>
    </div>
    <div v-if="manual" class="rd-ticket__manual">
      <label for="ticket-share-url">Link lịch trình</label>
      <input id="ticket-share-url" :value="shareUrl" readonly @focus="($event.target as HTMLInputElement).select()">
    </div>
  </dialog>
</template>

<style scoped>
.rd-ticket { width: calc(100% - 2 * var(--space-4)); max-width: 480px; max-height: calc(100dvh - 2 * var(--space-4)); box-sizing: border-box; padding: var(--space-4); overflow: auto; border: var(--border-strong) solid var(--ink); border-radius: var(--radius-card); background: var(--paper-raised); color: var(--ink); }
.rd-ticket::backdrop { background: color-mix(in srgb, var(--ink) 50%, transparent); }
.rd-ticket__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.rd-ticket__title { margin: 0; font-family: var(--font-display); font-size: 22px; }
.rd-ticket__close { flex: 0 0 auto; }
.rd-ticket__frame { display: flex; justify-content: center; margin-top: var(--space-3); }
.rd-ticket__image, .rd-ticket__skeleton { display: block; height: min(64dvh, 720px); max-width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius-thumb); }
.rd-ticket__image { width: auto; object-fit: contain; background: var(--ink); }
.rd-ticket__status { min-height: 1.5em; margin: var(--space-3) 0 0; font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
.rd-ticket__actions { display: grid; gap: var(--space-2); margin-top: var(--space-3); }
.rd-ticket__actions .rd-btn { width: 100%; height: var(--button-height); font: inherit; font-weight: 700; cursor: pointer; }
.rd-ticket__manual { display: grid; gap: var(--space-2); margin-top: var(--space-3); }
.rd-ticket__manual input { min-width: 0; width: 100%; box-sizing: border-box; min-height: var(--tap-min); padding: var(--space-2); border: var(--border-ink); border-radius: var(--radius-chip); background: var(--paper-raised); color: var(--ink); font: inherit; }
@media (prefers-reduced-motion: reduce) { .rd-ticket__skeleton { animation: none; } }
</style>
