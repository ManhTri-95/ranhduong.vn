import { ref } from 'vue';
import type { Router } from 'vue-router';
import { claimChunkReload, isChunkLoadError } from '@/shared/lib/chunk-reload';

/** Trang không mở được vì chunk lỗi, kể cả sau một lần tải lại; App hiện thông báo kèm nút Tải lại trang. */
export const chunkFailedTarget = ref<string | null>(null);

export interface ChunkRecoveryDeps {
  storage: () => Pick<Storage, 'getItem' | 'setItem'> | null;
  reload: (url: string) => void;
  /** Có listener onError thì Vue Router không tự in lỗi nữa, nên lỗi không phải chunk phải tự ghi ra. */
  report: (error: unknown) => void;
}

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const browserDeps: ChunkRecoveryDeps = {
  storage: sessionStore,
  reload: (url) => window.location.assign(url),
  report: (error) => console.error(error),
};

/** Chunk của route lỗi (bản deploy mới, phiên Access hết hạn) thì tải lại toàn trang tới trang đích, tối đa một lần. */
export function installChunkRecovery(router: Router, deps: Partial<ChunkRecoveryDeps> = {}): void {
  const { storage, reload, report } = { ...browserDeps, ...deps };
  router.onError((error: unknown, to) => {
    if (!isChunkLoadError(error)) {
      report(error);
      return;
    }
    if (claimChunkReload(to.fullPath, storage(), Date.now())) reload(to.fullPath);
    else chunkFailedTarget.value = to.fullPath;
  });
  router.afterEach((_to, _from, failure) => {
    if (!failure) chunkFailedTarget.value = null;
  });
}
