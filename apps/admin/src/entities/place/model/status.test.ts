import { describe, expect, it } from 'vitest';
import { statusChip, verifySourceLabel } from './status';

const NOW = new Date('2026-10-08T03:00:00Z');

describe('statusChip', () => {
  it('đang hiển thị, xác minh trong 90 ngày: "Đang hiển thị" màu ok', () => {
    expect(statusChip({ status: 'active', lastVerifiedAt: '2026-10-01T03:00:00.000Z' }, NOW)).toEqual({
      label: 'Đang hiển thị',
      className: 'rd-status--ok',
    });
  });
  it('đang hiển thị mà quá 90 ngày hoặc chưa xác minh lần nào: "Cần xác minh lại" màu warn', () => {
    const stale = { label: 'Cần xác minh lại', className: 'rd-status--warn' };
    expect(statusChip({ status: 'active', lastVerifiedAt: '2026-07-01T03:00:00.000Z' }, NOW)).toEqual(stale);
    expect(statusChip({ status: 'active' }, NOW)).toEqual(stale);
  });
  it('trạng thái khác giữ nhãn và màu riêng, không xét ngày xác minh', () => {
    expect(statusChip({ status: 'draft' }, NOW)).toEqual({ label: 'Nháp', className: 'rd-status--draft' });
    expect(statusChip({ status: 'suspected' }, NOW)).toEqual({ label: 'Bị nghi ngờ', className: 'rd-status--bad' });
    expect(statusChip({ status: 'hidden' }, NOW)).toEqual({ label: 'Đã ẩn', className: 'rd-status--warn' });
    expect(statusChip({ status: 'closed' }, NOW)).toEqual({ label: 'Đã đóng cửa', className: 'rd-status--warn' });
  });
});

describe('verifySourceLabel', () => {
  it('tên nguồn theo danh mục, như lựa chọn trong form', () => {
    expect(verifySourceLabel('cafe', 'owner')).toBe('Quán đã xác nhận');
    expect(verifySourceLabel('cafe', 'admin')).toBe('Chỉ dựa trên Facebook');
    expect(verifySourceLabel('attraction', 'admin')).toBe('Điểm công cộng');
    expect(verifySourceLabel('attraction', 'owner')).toBe('Đơn vị quản lý đã xác nhận');
  });
  it('chưa chọn; nguồn của các lát sau', () => {
    expect(verifySourceLabel('cafe', undefined)).toBe('Chưa chọn');
    expect(verifySourceLabel('cafe', 'ctv')).toBe('Cộng tác viên');
    expect(verifySourceLabel('cafe', 'user')).toBe('Người dùng');
  });
});
