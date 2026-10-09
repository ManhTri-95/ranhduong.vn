import { MediaAttachInput, MediaUploadInput, type AdminPlace, type PhotoSource } from '@ranhduong/contracts';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { attachPhoto, completeUpload, putPhoto, requestUpload, uploadStatus } from '@/entities/media/api/media';
import { toApiFailure } from '@/shared/api/errors';
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from '@/shared/lib/local-draft';

export function usePhotoUpload(placeId: () => string | null, onAttached: (place: AdminPlace) => void) {
  const file = shallowRef<File | null>(null);
  const source = ref<PhotoSource | ''>('');
  const credit = ref('');
  const license = ref('');
  const sourceUrl = ref('');
  const busy = ref(false);
  const message = ref('');
  const failed = ref(false);
  const needsLogin = ref(false);
  const pendingId = ref<string | null>(null);
  const canResume = computed(() => pendingId.value !== null && !busy.value);
  let alive = true;
  let controller: AbortController | undefined;
  let stopWait: (() => void) | undefined;
  const pendingKey = (id: string) => `rd-admin:photo-upload:${id}`;
  watch(placeId, (id) => {
    pendingId.value = id ? readLocalDraft(pendingKey(id), MediaAttachInput)?.value.uploadId ?? null : null;
  }, { immediate: true });
  function clearPending(): void {
    const id = placeId();
    if (id) removeLocalDraft(pendingKey(id));
    pendingId.value = null;
  }

  onScopeDispose(() => { alive = false; controller?.abort(); stopWait?.(); });
  function wait(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { stopWait = undefined; resolve(); }, 1500);
      stopWait = () => { clearTimeout(timer); resolve(); };
    });
  }
  async function finish(id: string, targetPlace: string): Promise<void> {
    message.value = 'Đang xử lý ảnh…';
    let status = await completeUpload(id);
    const deadline = Date.now() + 120_000;
    while (alive && status.status !== 'ready' && status.status !== 'failed') {
      if (Date.now() >= deadline) throw new Error('Ảnh vẫn đang xử lý. Bấm “Kiểm tra lại” sau một lát.');
      await wait();
      if (!alive) return;
      status = await uploadStatus(id);
    }
    if (!alive) return;
    if (status.status === 'failed') {
      clearPending();
      throw new Error(status.message ?? 'Ảnh không hợp lệ. Chọn ảnh khác.');
    }
    const updated = await attachPhoto(targetPlace, id);
    if (!alive) return;
    onAttached(updated);
    clearPending();
    message.value = 'Đã thêm ảnh.';
  }
  function showError(err: unknown): void {
    if (!alive) return;
    failed.value = true;
    const failure = toApiFailure(err);
    if (failure.status === 404) clearPending();
    needsLogin.value = failure.status === 401;
    message.value = needsLogin.value ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.'
      : failure.error?.message ?? (err instanceof Error ? err.message : 'Chưa tải được ảnh. Thử lại.');
  }
  async function upload(): Promise<void> {
    if (busy.value) return;
    failed.value = false;
    needsLogin.value = false;
    const targetPlace = placeId();
    if (!targetPlace) { failed.value = true; message.value = 'Lưu nháp địa điểm trước khi thêm ảnh.'; return; }
    const selected = file.value;
    if (!selected) { failed.value = true; message.value = 'Chọn ảnh cần tải lên.'; return; }
    const input = MediaUploadInput.safeParse({ contentType: selected.type, size: selected.size, source: source.value, credit: credit.value, license: license.value, sourceUrl: sourceUrl.value.trim() || undefined });
    if (!input.success) {
      failed.value = true;
      const first = input.error.issues[0];
      message.value = first?.path[0] === 'source' ? 'Chọn nguồn ảnh.'
        : first?.path[0] === 'contentType' ? 'Chỉ nhận JPEG, PNG hoặc WebP.'
        : first?.message ?? 'Kiểm tra thông tin ảnh.';
      return;
    }
    busy.value = true;
    controller = new AbortController();
    clearPending();
    message.value = 'Đang tải ảnh…';
    try {
      const upload = await requestUpload(targetPlace, input.data);
      if (!alive) return;
      await putPhoto(upload, selected, controller.signal);
      pendingId.value = upload.uploadId;
      writeLocalDraft(pendingKey(targetPlace), { uploadId: upload.uploadId });
      if (!alive) return;
      await finish(upload.uploadId, targetPlace);
    } catch (err) { showError(err); }
    finally { busy.value = false; }
  }
  async function resume(): Promise<void> {
    const id = pendingId.value;
    const targetPlace = placeId();
    if (!id || !targetPlace || busy.value) return;
    busy.value = true;
    failed.value = false;
    needsLogin.value = false;
    try { await finish(id, targetPlace); }
    catch (err) { showError(err); }
    finally { busy.value = false; }
  }
  return { file, source, credit, license, sourceUrl, busy, message, failed, needsLogin, canResume, upload, resume };
}
