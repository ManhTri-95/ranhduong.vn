import type { TemplateDayInput, TemplateIssue } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { firstIssueTarget, issueCounts, moveAnnouncement, publishConfirm, stopPosition, stopRow, templateMeta } from './summary';

const place = '111111111111111111111111';
const k1 = '11111111-1111-4111-8111-111111111111';
const k2 = '22222222-2222-4222-8222-222222222222';
const k3 = '33333333-3333-4333-8333-333333333333';
const stop = (key: string) => ({ key, placeId: place, kind: 'visit' as const, note: '' });
const days: TemplateDayInput[] = [
  { startTime: '07:00', stops: [stop(k1), stop(k2)] },
  { startTime: '07:00', stops: [stop(k3)] },
];
const issue = (level: TemplateIssue['level'], day: number, stopKey?: string): TemplateIssue => ({ code: 'outside_hours', level, day, stopKey, message: 'Giả lập' });

describe('templateMeta, issueCounts', () => {
  it('tóm tắt số ngày, số điểm, phương tiện, nhịp độ', () => {
    expect(templateMeta({ days, transport: 'motorbike', pace: 'relaxed' })).toBe('2 ngày · 3 điểm · xe máy · thong thả');
  });
  it('đếm lỗi và nhắc nhở', () => {
    expect(issueCounts({ issues: [issue('error', 0, k1), issue('warning', 1), issue('warning', 0)] })).toEqual({ errors: 1, warnings: 2 });
  });
});

describe('firstIssueTarget', () => {
  it('lỗi trước nhắc nhở, rồi theo ngày và thứ tự điểm', () => {
    expect(firstIssueTarget({ issues: [issue('warning', 0, k1), issue('error', 1, k3), issue('error', 0, k2)] }, days)).toEqual({ day: 0, stopKey: k2 });
  });
  it('vấn đề cả ngày đứng trước các điểm trong ngày; không có vấn đề thì null', () => {
    expect(firstIssueTarget({ issues: [issue('warning', 0, k1), issue('warning', 0)] }, days)).toEqual({ day: 0, stopKey: null });
    expect(firstIssueTarget({ issues: [] }, days)).toBeNull();
  });
});

describe('stopRow', () => {
  it('giờ lấy từ lịch đã tính, thiếu thì lấy giờ sửa tay; đếm vấn đề của riêng điểm', () => {
    const issues = [issue('error', 0, k1), issue('warning', 0, k1), issue('warning', 0, k2)];
    expect(stopRow(stop(k1), { start: '07:00', end: '08:00' }, issues)).toEqual({ time: '07:00–08:00', manual: false, errors: 1, warnings: 1 });
    expect(stopRow({ ...stop(k2), manualStart: '09:' }, undefined, [])).toEqual({ time: '09:–--:--', manual: true, errors: 0, warnings: 0 });
  });
});

describe('stopPosition, moveAnnouncement', () => {
  it('tìm vị trí điểm và báo cho trình đọc màn hình', () => {
    expect(stopPosition(days, k3)).toEqual({ day: 1, index: 0 });
    expect(stopPosition(days, '44444444-4444-4444-8444-444444444444')).toBeNull();
    expect(moveAnnouncement(days, k2, 'Quán Giả Lập')).toBe('Đã chuyển Quán Giả Lập tới vị trí 2, ngày 1.');
  });
});

describe('publishConfirm', () => {
  it('hỏi khi công khai lần đầu và khi chuyển về nháp; lưu tiếp cùng trạng thái thì không', () => {
    expect(publishConfirm(null, 'published')).toBe('first-publish');
    expect(publishConfirm('draft', 'published')).toBe('first-publish');
    expect(publishConfirm('published', 'draft')).toBe('unpublish');
    expect(publishConfirm('published', 'published')).toBeNull();
    expect(publishConfirm('draft', 'draft')).toBeNull();
  });
});
