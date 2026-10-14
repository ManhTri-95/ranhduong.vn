import { onBeforeUnmount, onMounted } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, type RouteLocationNormalized } from 'vue-router';
import { useConfirm, type ConfirmRequest } from './confirm';

/** Chỉ hỏi khi có thay đổi chưa lưu mà máy này không giữ được (form địa điểm, lịch trình, mùa dùng chung quy tắc này). */
export function shouldConfirmLeave(dirty: boolean, kept: boolean): boolean {
  return dirty && !kept;
}

/** URL vừa đổi sang đúng bản ghi đang mở (tạo xong, /moi thành /{id}): không phải rời trang. */
export function isSameRecordId(to: { params: Readonly<Record<string, string | string[]>> }, currentId: string | null): boolean {
  return currentId !== null && to.params.id === currentId;
}

export const LEAVE_CONFIRM: ConfirmRequest = {
  title: 'Rời trang khi chưa lưu?',
  body: 'Máy này chưa giữ được bản đang sửa. Rời trang bây giờ sẽ mất các thay đổi chưa lưu.',
  confirmLabel: 'Vẫn rời trang',
  cancelLabel: 'Ở lại trang',
  tone: 'danger',
};

export interface UnsavedGuardOptions {
  dirty: () => boolean;
  kept: () => boolean;
  /** Ghi ngay bản đang sửa vào máy trước khi quyết định (bỏ qua thời gian chờ tự lưu). */
  flush?: () => void;
  skip?: (to: RouteLocationNormalized) => boolean;
}

/** Hỏi lại trước khi rời trang (trong app: RdConfirmDialog; đóng tab: hộp của trình duyệt). */
export function useUnsavedGuard(options: UnsavedGuardOptions): void {
  const confirm = useConfirm();
  function needsConfirm(): boolean {
    options.flush?.();
    return shouldConfirmLeave(options.dirty(), options.kept());
  }
  async function guard(to: RouteLocationNormalized): Promise<boolean> {
    if (options.skip?.(to) || !needsConfirm()) return true;
    return confirm(LEAVE_CONFIRM);
  }
  onBeforeRouteLeave((to) => guard(to));
  onBeforeRouteUpdate((to, from) => (to.path === from.path ? true : guard(to)));
  function beforeUnload(event: BeforeUnloadEvent): void {
    if (!needsConfirm()) return;
    event.preventDefault();
    event.returnValue = '';
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
}
