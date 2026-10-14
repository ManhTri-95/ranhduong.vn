import { describe, expect, it } from 'vitest';
import { daysAgoText, formatLocalDate, formatLocalTime, updatedAgoText } from './time';

describe('formatLocalTime', () => {
  it('hiện theo giờ Việt Nam (UTC+7)', () => {
    const text = formatLocalTime('2026-10-08T07:32:00Z');
    expect(text).toMatch(/14:32/);
    expect(text).toMatch(/08\/10/);
  });
});

describe('daysAgoText', () => {
  it('cùng ngày ở Việt Nam: hôm nay; ngày trong tương lai (lệch đồng hồ) cũng là hôm nay', () => {
    const now = new Date('2026-10-08T03:00:00Z');
    expect(daysAgoText('2026-10-08T00:30:00Z', now)).toBe('Hôm nay');
    expect(daysAgoText('2026-10-09T03:00:00Z', now)).toBe('Hôm nay');
  });
  it('tính theo ngày lịch ở Việt Nam (UTC+7), không theo 24 giờ', () => {
    // 23:59 ngày 7/10 và 00:01 ngày 8/10 giờ Việt Nam.
    expect(daysAgoText('2026-10-07T16:59:00Z', new Date('2026-10-07T17:01:00Z'))).toBe('Hôm qua');
  });
  it('từ hai ngày: "N ngày trước"', () => {
    const now = new Date('2026-10-08T03:00:00Z');
    expect(daysAgoText('2026-10-06T03:00:00Z', now)).toBe('2 ngày trước');
    expect(daysAgoText('2026-07-10T03:00:00Z', now)).toBe('90 ngày trước');
  });
});

describe('S28 formatLocalDate, updatedAgoText', () => {
  it('ngày theo giờ Việt Nam, đủ năm', () => {
    expect(formatLocalDate('2026-10-07T18:30:00Z')).toBe('08/10/2026');
  });
  it('sửa hôm nay thì ghi giờ; hôm trước thì như cột xác minh', () => {
    const now = new Date('2026-10-08T10:00:00Z');
    expect(updatedAgoText('2026-10-08T03:05:00Z', now)).toBe('Hôm nay 10:05');
    expect(updatedAgoText('2026-10-07T03:00:00Z', now)).toBe('Hôm qua');
    expect(updatedAgoText('2026-10-01T03:00:00Z', now)).toBe('7 ngày trước');
  });
});
