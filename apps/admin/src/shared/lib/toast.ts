import { shallowRef } from 'vue';

export interface Toast {
  id: number;
  message: string;
}

/** Thông báo thành công ở đáy màn hình: mỗi lúc một cái, tự ẩn, dừng đếm khi rê chuột hoặc focus. */
export function createToastStore(durationMs = 4000) {
  const current = shallowRef<Toast | null>(null);
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paused = false;
  function schedule(): void {
    clearTimeout(timer);
    if (!paused && current.value) {
      timer = setTimeout(() => {
        current.value = null;
      }, durationMs);
    }
  }
  return {
    current,
    show(message: string): void {
      current.value = { id: ++seq, message };
      schedule();
    },
    pause(): void {
      paused = true;
      clearTimeout(timer);
    },
    resume(): void {
      paused = false;
      schedule();
    },
    dismiss(): void {
      clearTimeout(timer);
      current.value = null;
    },
  };
}

const store = createToastStore();
export const toastState = store.current;
export const toastControls = { pause: store.pause, resume: store.resume, dismiss: store.dismiss };

export function useToast(): { show(message: string): void } {
  return { show: store.show };
}
