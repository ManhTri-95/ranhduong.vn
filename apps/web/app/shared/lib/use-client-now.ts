import { onMounted, ref, type Ref } from 'vue';

/**
 * Giờ hiện tại, chỉ có sau khi trang chạy trên trình duyệt. HTML được cache SWR nên không được chứa trạng thái mở cửa
 * tính lúc render; SSR và lần hydrate đầu cùng là null nên không lệch hydration.
 */
export function useClientNow(): Ref<Date | null> {
  const now = ref<Date | null>(null);
  onMounted(() => {
    now.value = new Date();
  });
  return now;
}
