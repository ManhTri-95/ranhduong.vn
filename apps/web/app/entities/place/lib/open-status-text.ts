import type { OpenStatus } from '@ranhduong/contracts';

const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export interface OpenStatusText {
  /** Chip nền accent, chỉ khi đang mở. */
  chip?: 'Đang mở';
  /** Chữ phụ cạnh chip (class rd-quiet). */
  text?: string;
}

/** Chữ hiển thị cho trạng thái mở cửa (ui-spec mục 4: chip "Đang mở" kèm "Đóng lúc HH:mm"). */
export function openStatusText(status: OpenStatus): OpenStatusText {
  switch (status.kind) {
    case 'unknown':
      return {};
    case 'open':
      return { chip: 'Đang mở', text: status.closesAt ? `Đóng lúc ${status.closesAt}` : 'Mở cả ngày' };
    case 'closed': {
      const when = status.inDays === 0 ? '' : status.inDays === 1 ? ' ngày mai' : ` ${WEEKDAY[status.day] ?? ''}`;
      return { text: `Đang đóng · mở lúc ${status.opensAt}${when}` };
    }
  }
}
