import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/**
 * Giờ hiện tại, chỉ có sau khi trang chạy trên trình duyệt. HTML được cache SWR nên không được chứa trạng thái mở cửa
 * tính lúc render; SSR và lần hydrate đầu cùng là null nên không lệch hydration.
 */
export function useClientNow(): Ref<Date | null> {
  const now = ref<Date | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;
  const update = () => { now.value = new Date(); };
  onMounted(() => {
    update();
    timer = setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', update);
  });
  return now;
}
