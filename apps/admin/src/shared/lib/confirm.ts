import { shallowRef, type ShallowRef } from 'vue';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: nút xác nhận nền đỏ (bỏ thay đổi, rời trang, bỏ ngày). */
  tone?: 'default' | 'danger';
}
interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

/** Hàng đợi hỏi lại: mỗi lúc một hộp thoại; hỏi thêm khi đang có hộp thì chờ tới lượt. */
export function createConfirmQueue(): { current: ShallowRef<ConfirmRequest | null>; ask(request: ConfirmRequest): Promise<boolean>; answer(ok: boolean): void; cancelAll(): void } {
  const current = shallowRef<PendingConfirm | null>(null);
  const waiting: PendingConfirm[] = [];
  function ask(request: ConfirmRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const pending = { ...request, resolve };
      if (current.value) waiting.push(pending);
      else current.value = pending;
    });
  }
  function answer(ok: boolean): void {
    const pending = current.value;
    if (!pending) return;
    current.value = waiting.shift() ?? null;
    pending.resolve(ok);
  }
  /** Đã sang trang khác: mọi lời hỏi còn chờ thuộc trang cũ, trả "không" để code của trang cũ không chạy tiếp. */
  function cancelAll(): void {
    const pending = [...(current.value ? [current.value] : []), ...waiting.splice(0)];
    current.value = null;
    for (const item of pending) item.resolve(false);
  }
  return { current, ask, answer, cancelAll };
}

const queue = createConfirmQueue();
/** Hộp đang hỏi; RdConfirmDialog (đặt trong khung trang) hiển thị. */
export const confirmState = queue.current;
export const answerConfirm = queue.answer;
export const cancelPendingConfirms = queue.cancelAll;

/** Hỏi lại bằng hộp thoại của admin thay cho window.confirm. */
export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
  return queue.ask;
}
