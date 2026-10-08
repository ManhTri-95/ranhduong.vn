<script setup lang="ts">
import type { AdminPlaceSummary, AdminVerifySource } from '@ranhduong/contracts';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { changePlaceStatus, deletePlace, verifyPlace } from '@/entities/place/api/places';
import { placeDraftKey } from '@/entities/place/model/draft-key';
import { statusChip } from '@/entities/place/model/status';
import { verifySourceOptions } from '@/entities/place/model/verify-options';
import { toApiFailure } from '@/shared/api/errors';
import { removeLocalDraft } from '@/shared/lib/local-draft';
import {
  actionFailure,
  doneMessage,
  menuActions,
  STATUS_ACTION_EXPLAIN,
  STATUS_ACTION_LABEL,
  stepFor,
  type ActionFailure,
  type ActionRequest,
  type DialogStep,
  type PlaceAction,
} from '../model/actions';

const props = defineProps<{ place: AdminPlaceSummary; start: DialogStep; now: Date }>();
const emit = defineEmits<{ done: [message: string]; close: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);
const step = ref<DialogStep>(props.start);
const busy = ref(false);
const failure = ref<ActionFailure | null>(null);
/** Nguồn đang chọn khi xác minh: mặc định là nguồn đã lưu (nếu là owner hoặc admin). */
const source = ref<AdminVerifySource | ''>(props.place.verifySource === 'owner' || props.place.verifySource === 'admin' ? props.place.verifySource : '');

const chip = computed(() => statusChip(props.place, props.now));
const actions = computed(() => menuActions(props.place));
const verifyOptions = computed(() => verifySourceOptions(props.place.category));
const confirmLabel = computed(() => {
  const current = step.value;
  if (current.kind === 'verify') return 'Đã xác minh';
  if (current.kind === 'status') return STATUS_ACTION_LABEL[current.action];
  return 'Xoá hẳn';
});

onMounted(() => dialog.value?.showModal());

function go(action: PlaceAction): void {
  failure.value = null;
  step.value = stepFor(action) ?? { kind: 'menu' };
}

async function submit(request: ActionRequest): Promise<void> {
  busy.value = true;
  failure.value = null;
  const id = props.place.id;
  try {
    if (request.kind === 'verify') await verifyPlace(id, request.verifySource);
    else if (request.kind === 'status') await changePlaceStatus(id, request.action);
    else {
      await deletePlace(id);
      removeLocalDraft(placeDraftKey(id));
    }
    emit('done', doneMessage(props.place.name, props.place.status, request));
    dialog.value?.close();
  } catch (err) {
    failure.value = actionFailure(toApiFailure(err));
  } finally {
    busy.value = false;
  }
}

// Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-if nên đọc lại bước hiện tại ở đây.
function confirm(): void {
  const current = step.value;
  if (current.kind === 'verify' && source.value) void submit({ kind: 'verify', verifySource: source.value });
  else if (current.kind === 'status') void submit({ kind: 'status', action: current.action });
  else if (current.kind === 'delete') void submit({ kind: 'delete' });
}

function close(): void {
  dialog.value?.close();
}

/** Đang gửi thì Esc không đóng (kết quả chưa về). */
function onCancel(event: Event): void {
  if (busy.value) event.preventDefault();
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="place-actions-title" @close="emit('close')" @cancel="onCancel">
    <div class="body">
      <header class="head">
        <h2 id="place-actions-title" class="title">{{ place.name }}</h2>
        <span :class="['rd-status', chip.className]">{{ chip.label }}</span>
      </header>

      <div v-if="failure" class="rd-callout rd-callout--bad" role="alert">
        <p v-for="(message, i) in failure.messages" :key="i" class="line">{{ message }}</p>
        <RouterLink v-if="failure.login" :to="{ path: '/dang-nhap', query: { returnTo: '/dia-diem' } }">Đăng nhập lại</RouterLink>
      </div>

      <template v-if="step.kind === 'menu'">
        <ul v-if="actions.length > 0" class="menu">
          <li v-for="action in actions" :key="action.label">
            <button type="button" class="rd-btn rd-btn--outline" @click="go(action)">{{ action.label }}</button>
          </li>
        </ul>
        <div class="actions">
          <RouterLink class="rd-btn rd-btn--outline" :to="`/dia-diem/${place.id}`">Mở form để sửa</RouterLink>
          <button type="button" class="rd-btn rd-btn--outline" @click="close">Đóng</button>
        </div>
      </template>

      <form v-else class="step" @submit.prevent="confirm">
        <template v-if="step.kind === 'verify'">
          <p class="line">
            Bạn đã kiểm lại giờ mở cửa, địa chỉ, giá và thấy còn đúng. Ngày xác minh lần cuối sẽ là hôm nay.
            <template v-if="place.status !== 'active'">Sau khi xác minh, chỗ này hiện trên web.</template>
          </p>
          <fieldset class="rd-field">
            <legend class="rd-field__label">Nguồn xác nhận</legend>
            <label v-for="option in verifyOptions" :key="option.value" class="rd-choice rd-choice--block">
              <input v-model="source" type="radio" name="verify-source" :value="option.value" />
              <span class="option">
                <span>{{ option.label }}</span>
                <span class="rd-field__hint">{{ option.hint }}</span>
              </span>
            </label>
          </fieldset>
        </template>
        <p v-else-if="step.kind === 'status'" class="line">{{ STATUS_ACTION_EXPLAIN[step.action] }}</p>
        <p v-else class="line">
          Xoá hẳn nháp "{{ place.name }}"? Mọi thông tin đã nhập sẽ mất, không khôi phục được. Nháp chưa từng hiện trên web nên không
          ảnh hưởng đường dẫn nào.
        </p>
        <div class="actions">
          <button type="submit" class="rd-btn rd-btn--primary" :disabled="busy || (step.kind === 'verify' && !source)">{{ confirmLabel }}</button>
          <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="close">Huỷ</button>
        </div>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  box-sizing: border-box;
  width: min(480px, calc(100vw - 2 * var(--page-gutter)));
  max-height: calc(100vh - 2 * var(--page-gutter));
  padding: 0;
  border: var(--border);
  border-radius: var(--radius-card);
  background: var(--paper-raised);
  color: var(--ink);
}
.dialog::backdrop { background: color-mix(in srgb, var(--ink) 45%, transparent); }
.body { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5); }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.title { margin: 0; font: 700 20px/1.3 var(--font-display); overflow-wrap: anywhere; }
.menu { display: flex; flex-direction: column; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.menu .rd-btn { width: 100%; }
.step { display: flex; flex-direction: column; gap: var(--space-4); }
.option { display: flex; flex-direction: column; gap: 2px; }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.line { margin: 0; }
</style>
