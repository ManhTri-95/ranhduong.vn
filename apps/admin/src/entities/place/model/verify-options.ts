import type { AdminVerifySource, PlaceCategory } from '@ranhduong/contracts';

export interface VerifyOption {
  value: AdminVerifySource;
  label: string;
  hint: string;
}

/**
 * Lựa chọn nguồn xác nhận theo danh mục (data-collection mục 5): quán đã xác nhận là owner; chỉ dựa trên Facebook
 * hoặc điểm tham quan công cộng là admin. Điểm tham quan không hiện nhãn "chưa xác nhận" (needsOwnerConfirmation).
 */
export function verifySourceOptions(category: PlaceCategory | ''): VerifyOption[] {
  if (category === 'attraction') {
    return [
      { value: 'admin', label: 'Điểm công cộng', hint: 'Xác minh qua nguồn chính thức hoặc OpenStreetMap.' },
      { value: 'owner', label: 'Đơn vị quản lý đã xác nhận', hint: 'Đã nhắn hoặc gọi và được trả lời.' },
    ];
  }
  return [
    { value: 'owner', label: 'Quán đã xác nhận', hint: 'Quán đã trả lời tin nhắn hoặc điện thoại.' },
    { value: 'admin', label: 'Chỉ dựa trên Facebook', hint: 'Trang địa điểm sẽ hiện nhãn "Thông tin chưa được quán xác nhận".' },
  ];
}
