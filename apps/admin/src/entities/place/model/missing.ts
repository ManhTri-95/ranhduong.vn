import { ActivationIssueCode } from '@ranhduong/contracts';

/** Nhãn ngắn của điều kiện kích hoạt (cột "Còn thiếu", danh sách điều kiện của form). */
export const ACTIVATION_LABEL: Record<ActivationIssueCode, string> = {
  location_missing: 'Vị trí',
  hours_invalid: 'Giờ mở cửa',
  verify_source_missing: 'Nguồn xác nhận',
  photo_source_missing: 'Nguồn ảnh',
};

/** Nhãn các điều kiện còn thiếu, mỗi mã một lần, theo thứ tự trong contract. */
export function missingLabels(codes: readonly ActivationIssueCode[]): string[] {
  return ActivationIssueCode.options.filter((code) => codes.includes(code)).map((code) => ACTIVATION_LABEL[code]);
}
