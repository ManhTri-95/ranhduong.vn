import { describe, expect, it } from 'vitest';
import { openStatusText } from './open-status-text';

describe('openStatusText', () => {
  it('chưa có giờ thì không hiện gì', () => {
    expect(openStatusText({ kind: 'unknown' })).toEqual({});
  });
  it('đang mở: chip Đang mở và giờ đóng, hoặc mở cả ngày', () => {
    expect(openStatusText({ kind: 'open', closesAt: '22:00' })).toEqual({ chip: 'Đang mở', text: 'Đóng lúc 22:00' });
    expect(openStatusText({ kind: 'open', closesAt: null })).toEqual({ chip: 'Đang mở', text: 'Mở cả ngày' });
  });
  it('đang đóng: giờ mở lại hôm nay, ngày mai hoặc thứ trong tuần', () => {
    expect(openStatusText({ kind: 'closed', opensAt: '14:00', day: 3, inDays: 0 })).toEqual({ text: 'Đang đóng · mở lúc 14:00' });
    expect(openStatusText({ kind: 'closed', opensAt: '07:00', day: 4, inDays: 1 })).toEqual({ text: 'Đang đóng · mở lúc 07:00 ngày mai' });
    expect(openStatusText({ kind: 'closed', opensAt: '07:00', day: 2, inDays: 2 })).toEqual({ text: 'Đang đóng · mở lúc 07:00 Thứ Ba' });
    expect(openStatusText({ kind: 'closed', opensAt: '07:00', day: 0, inDays: 4 })).toEqual({ text: 'Đang đóng · mở lúc 07:00 Chủ nhật' });
  });
});
