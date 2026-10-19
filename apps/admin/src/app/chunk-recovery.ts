import { ref } from 'vue';
import type { Router } from 'vue-router';
import { claimChunkReload, isChunkLoadError } from '@/shared/lib/chunk-reload';

/** Trang không mở được vì chunk lỗi, kể cả sau một lần tải lại; App hiện thông báo kèm nút Tải lại trang. */
export const chunkFailedTarget = ref<string | null>(null);

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Chunk của route lỗi (bản deploy mới, phiên Access hết hạn) thì tải lại toàn trang tới trang đích, tối đa một lần. */
export function installChunkRecovery(router: Router): void {
  router.onError((error: unknown, to) => {
    if (!isChunkLoadError(error)) return;
    if (claimChunkReload(to.fullPath, sessionStore(), Date.now())) window.location.assign(to.fullPath);
    else chunkFailedTarget.value = to.fullPath;
  });
  router.afterEach((_to, _from, failure) => {
    if (!failure) chunkFailedTarget.value = null;
  });
}
