import {
  canVerify,
  statusActionsFor,
  verificationStale,
  type AdminPlaceSummary,
  type AdminVerifySource,
  type PlaceStatus,
  type PlaceStatusAction,
} from '@ranhduong/contracts';
import { failureMessages, type ApiFailure } from '@/shared/api/errors';

export const STATUS_ACTION_LABEL: Record<PlaceStatusAction, string> = {
  hide: 'Ẩn khỏi web',
  unhide: 'Hiện lại',
  close: 'Đã đóng cửa',
  reopen: 'Mở lại',
};

/** Giải thích trước khi bấm xác nhận (hộp thoại). Trang công khai của chỗ đã ẩn, đã đóng làm ở S11. */
export const STATUS_ACTION_EXPLAIN: Record<PlaceStatusAction, string> = {
  hide: 'Chỗ này thôi hiện trong danh sách, bản đồ và lịch trình. Đường dẫn vẫn được giữ; bấm Hiện lại để hiện như cũ.',
  unhide: 'Chỗ này hiện lại trên web với thông tin đang có.',
  close: 'Trang của chỗ này vẫn giữ và ghi "Đã đóng cửa"; chỗ này thôi hiện trong danh sách, bản đồ và lịch trình. Mở cửa lại thì bấm Mở lại.',
  reopen: 'Chỗ này hiện lại trên web. Nếu đã lâu chưa xác minh, nên xác minh lại giờ mở cửa.',
};

/** Thao tác trên một dòng: mở form, xác minh, đổi trạng thái, xoá nháp. */
export type PlaceAction =
  | { kind: 'edit'; label: string }
  | { kind: 'verify'; label: string }
  | { kind: 'status'; action: PlaceStatusAction; label: string }
  | { kind: 'delete'; label: string };

/** Request gửi lên API khi bấm nút xác nhận trong hộp thoại. */
export type ActionRequest = { kind: 'verify'; verifySource: AdminVerifySource } | { kind: 'status'; action: PlaceStatusAction } | { kind: 'delete' };

/** Bước đang hiện trong hộp thoại. */
export type DialogStep = { kind: 'menu' } | { kind: 'verify' } | { kind: 'status'; action: PlaceStatusAction } | { kind: 'delete' };

type Row = Pick<AdminPlaceSummary, 'status' | 'activationIssues' | 'lastVerifiedAt'>;

const VERIFY: PlaceAction = { kind: 'verify', label: 'Xác minh' };
const DELETE: PlaceAction = { kind: 'delete', label: 'Xoá nháp' };
const statusAction = (action: PlaceStatusAction): PlaceAction => ({ kind: 'status', action, label: STATUS_ACTION_LABEL[action] });

/** Xác minh ngay trong danh sách được: trạng thái cho phép và chỉ còn thiếu (nếu có) nguồn xác nhận, vì hộp thoại chọn nguồn. */
export function readyToVerify(row: Pick<AdminPlaceSummary, 'status' | 'activationIssues'>): boolean {
  return canVerify(row.status) && row.activationIssues.every((code) => code === 'verify_source_missing');
}

/**
 * Nút chính của dòng (ui-spec mục 12): nháp thiếu thông tin thì Hoàn thiện, nháp đủ thì Xác minh; đang hiển thị quá 90 ngày
 * thì Xác minh, còn lại Sửa; bị nghi ngờ thì Xác minh (lát 1 chưa có báo cáo để xem); đã ẩn thì Hiện lại; đã đóng thì Mở lại.
 */
export function primaryAction(row: Row, now: Date): PlaceAction {
  switch (row.status) {
    case 'draft':
      return readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Hoàn thiện' };
    case 'active':
      return verificationStale(row.lastVerifiedAt, now) && readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Sửa' };
    case 'suspected':
      return readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Sửa' };
    case 'hidden':
      return statusAction('unhide');
    case 'closed':
      return statusAction('reopen');
    case 'merged':
      return { kind: 'edit', label: 'Sửa' };
  }
}

/** Các thao tác trong hộp thoại "Thao tác khác": xác minh (khi được), đổi trạng thái, xoá (chỉ nháp). */
export function menuActions(row: Pick<AdminPlaceSummary, 'status' | 'activationIssues'>): PlaceAction[] {
  return [...(readyToVerify(row) ? [VERIFY] : []), ...statusActionsFor(row.status).map(statusAction), ...(row.status === 'draft' ? [DELETE] : [])];
}

/** Bước mở hộp thoại cho một thao tác; mở form thì không cần hộp thoại (null). */
export function stepFor(action: PlaceAction): DialogStep | null {
  switch (action.kind) {
    case 'edit':
      return null;
    case 'verify':
      return { kind: 'verify' };
    case 'status':
      return { kind: 'status', action: action.action };
    case 'delete':
      return { kind: 'delete' };
  }
}

/** Câu báo sau khi làm xong, hiện ở đầu danh sách. */
export function doneMessage(name: string, previous: PlaceStatus, request: ActionRequest): string {
  switch (request.kind) {
    case 'verify':
      return previous === 'active' ? `Đã xác minh "${name}".` : `Đã xác minh "${name}", chỗ này đang hiện trên web.`;
    case 'delete':
      return `Đã xoá nháp "${name}".`;
    case 'status': {
      const messages: Record<PlaceStatusAction, string> = {
        hide: `Đã ẩn "${name}" khỏi web.`,
        unhide: `"${name}" đã hiện lại trên web.`,
        close: `Đã đánh dấu "${name}" đã đóng cửa.`,
        reopen: `"${name}" đã mở lại và hiện trên web.`,
      };
      return messages[request.action];
    }
  }
}

export interface ActionFailure {
  messages: string[];
  /** Hiện link đăng nhập lại. */
  login: boolean;
}

/** Câu lỗi khi thao tác không xong: hết phiên, mất mạng, hoặc lỗi API (kèm điều kiện còn thiếu). */
export function actionFailure(failure: ApiFailure): ActionFailure {
  if (failure.status === 401) return { messages: ['Phiên đăng nhập đã hết, đăng nhập lại rồi thử lại.'], login: true };
  if (failure.status === 0) return { messages: ['Chưa kết nối được máy chủ, thử lại sau.'], login: false };
  const messages = failureMessages(failure);
  return { messages: messages.length > 0 ? messages : ['Chưa làm được, thử lại.'], login: false };
}
