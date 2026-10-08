import { PLACE_STATUS_LABEL, verificationStale, type PlaceCategory, type PlaceStatus, type VerifySource } from '@ranhduong/contracts';
import { verifySourceOptions } from './verify-options';

/** Màu chip trạng thái (ui-spec mục 12); chip luôn có chữ và chấm tròn (`.rd-status::before`). */
export const PLACE_STATUS_CLASS: Record<PlaceStatus, string> = {
  draft: 'rd-status--draft',
  active: 'rd-status--ok',
  suspected: 'rd-status--bad',
  hidden: 'rd-status--warn',
  closed: 'rd-status--warn',
  merged: 'rd-status--warn',
};

export interface StatusChip {
  label: string;
  className: string;
}

/** Chip trạng thái trong danh sách: chỗ đang hiển thị quá 90 ngày chưa xác minh ghi "Cần xác minh lại". */
export function statusChip(place: { status: PlaceStatus; lastVerifiedAt?: string }, now: Date): StatusChip {
  if (place.status === 'active' && verificationStale(place.lastVerifiedAt, now)) {
    return { label: 'Cần xác minh lại', className: 'rd-status--warn' };
  }
  return { label: PLACE_STATUS_LABEL[place.status], className: PLACE_STATUS_CLASS[place.status] };
}

/** Cột "Xác nhận": tên nguồn theo danh mục như lựa chọn trong form; chưa chọn thì "Chưa chọn". */
export function verifySourceLabel(category: PlaceCategory, source: VerifySource | undefined): string {
  if (source === undefined) return 'Chưa chọn';
  if (source === 'ctv') return 'Cộng tác viên';
  if (source === 'user') return 'Người dùng';
  return verifySourceOptions(category).find((option) => option.value === source)?.label ?? source;
}
