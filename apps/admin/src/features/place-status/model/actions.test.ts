import type { AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { actionFailure, doneMessage, menuActions, primaryAction, readyToVerify, stepFor } from './actions';

const NOW = new Date('2026-10-08T03:00:00Z');
type Row = Pick<AdminPlaceSummary, 'status' | 'activationIssues' | 'lastVerifiedAt'>;
const row = (overrides: Partial<Row> = {}): Row => ({
  status: 'active',
  activationIssues: [],
  lastVerifiedAt: '2026-10-01T03:00:00.000Z',
  ...overrides,
});
const labels = (r: Row) => menuActions(r).map((a) => a.label);

describe('readyToVerify', () => {
  it('nháp chỉ thiếu nguồn xác nhận (hộp thoại sẽ chọn) hoặc không thiếu gì: được', () => {
    expect(readyToVerify(row({ status: 'draft', activationIssues: ['verify_source_missing'] }))).toBe(true);
    expect(readyToVerify(row({ status: 'draft' }))).toBe(true);
  });
  it('còn thiếu toạ độ, giờ, nguồn ảnh; hoặc đã ẩn, đã đóng: không được', () => {
    expect(readyToVerify(row({ status: 'draft', activationIssues: ['location_missing', 'verify_source_missing'] }))).toBe(false);
    expect(readyToVerify(row({ status: 'hidden' }))).toBe(false);
    expect(readyToVerify(row({ status: 'closed' }))).toBe(false);
  });
});

describe('primaryAction', () => {
  it('nháp: đủ thì Xác minh, thiếu thì Hoàn thiện (mở form)', () => {
    expect(primaryAction(row({ status: 'draft', activationIssues: ['verify_source_missing'] }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ status: 'draft', activationIssues: ['hours_invalid'] }), NOW)).toEqual({ kind: 'edit', label: 'Hoàn thiện' });
  });
  it('đang hiển thị: còn hạn thì Sửa; quá 90 ngày thì Xác minh; dữ liệu hỏng thì Sửa', () => {
    expect(primaryAction(row(), NOW)).toEqual({ kind: 'edit', label: 'Sửa' });
    expect(primaryAction(row({ lastVerifiedAt: undefined }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ lastVerifiedAt: undefined, activationIssues: ['photo_source_missing'] }), NOW)).toEqual({ kind: 'edit', label: 'Sửa' });
  });
  it('bị nghi ngờ: Xác minh (lát 1 chưa có báo cáo); đã ẩn: Hiện lại; đã đóng cửa: Mở lại', () => {
    expect(primaryAction(row({ status: 'suspected' }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ status: 'hidden' }), NOW)).toEqual({ kind: 'status', action: 'unhide', label: 'Hiện lại' });
    expect(primaryAction(row({ status: 'closed' }), NOW)).toEqual({ kind: 'status', action: 'reopen', label: 'Mở lại' });
  });
});

describe('menuActions', () => {
  it('theo trạng thái; chỉ nháp mới có Xoá nháp', () => {
    expect(labels(row({ status: 'draft', activationIssues: ['verify_source_missing'] }))).toEqual(['Xác minh', 'Xoá nháp']);
    expect(labels(row({ status: 'draft', activationIssues: ['location_missing'] }))).toEqual(['Xoá nháp']);
    expect(labels(row())).toEqual(['Xác minh', 'Ẩn khỏi web', 'Đã đóng cửa']);
    expect(labels(row({ status: 'suspected' }))).toEqual(['Xác minh', 'Đã đóng cửa']);
    expect(labels(row({ status: 'hidden' }))).toEqual(['Hiện lại', 'Đã đóng cửa']);
    expect(labels(row({ status: 'closed' }))).toEqual(['Mở lại']);
  });
});

describe('stepFor', () => {
  it('mở form thì không cần hộp thoại; thao tác khác mở đúng bước', () => {
    expect(stepFor({ kind: 'edit', label: 'Sửa' })).toBeNull();
    expect(stepFor({ kind: 'verify', label: 'Xác minh' })).toEqual({ kind: 'verify' });
    expect(stepFor({ kind: 'status', action: 'hide', label: 'Ẩn khỏi web' })).toEqual({ kind: 'status', action: 'hide' });
    expect(stepFor({ kind: 'delete', label: 'Xoá nháp' })).toEqual({ kind: 'delete' });
  });
});

describe('doneMessage', () => {
  it('xác minh nháp thì nói đã hiện trên web; xác minh chỗ đang hiển thị thì không', () => {
    expect(doneMessage('Quán Giả Lập', 'draft', { kind: 'verify', verifySource: 'owner' })).toBe('Đã xác minh "Quán Giả Lập", chỗ này đang hiện trên web.');
    expect(doneMessage('Quán Giả Lập', 'active', { kind: 'verify', verifySource: 'owner' })).toBe('Đã xác minh "Quán Giả Lập".');
  });
  it('đổi trạng thái, xoá nháp', () => {
    expect(doneMessage('Quán Giả Lập', 'active', { kind: 'status', action: 'hide' })).toBe('Đã ẩn "Quán Giả Lập" khỏi web.');
    expect(doneMessage('Quán Giả Lập', 'closed', { kind: 'status', action: 'reopen' })).toBe('"Quán Giả Lập" đã mở lại và hiện trên web.');
    expect(doneMessage('Quán Giả Lập', 'draft', { kind: 'delete' })).toBe('Đã xoá nháp "Quán Giả Lập".');
  });
});

describe('actionFailure', () => {
  it('hết phiên thì kèm link đăng nhập lại; mất mạng', () => {
    expect(actionFailure({ status: 401, error: null })).toEqual({ messages: ['Phiên đăng nhập đã hết, đăng nhập lại rồi thử lại.'], login: true });
    expect(actionFailure({ status: 0, error: null })).toEqual({ messages: ['Chưa kết nối được máy chủ, thử lại sau.'], login: false });
  });
  it('lỗi API: câu chính và từng điều kiện còn thiếu; không đọc được thân lỗi thì câu chung', () => {
    const failure = {
      status: 400,
      error: {
        code: 'VALIDATION_FAILED' as const,
        message: 'Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.',
        details: [{ code: 'hours_invalid', message: 'Chưa có giờ mở cửa' }],
      },
    };
    expect(actionFailure(failure)).toEqual({
      messages: ['Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.', 'Chưa có giờ mở cửa'],
      login: false,
    });
    expect(actionFailure({ status: 500, error: null })).toEqual({ messages: ['Chưa làm được, thử lại.'], login: false });
  });
});
