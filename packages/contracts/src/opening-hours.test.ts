import { describe, expect, it } from 'vitest';
import { isOpenAt, openStatus, OpeningHoursParseError, parseOpeningHours } from './opening-hours.js';

describe('parseOpeningHours', () => {
  it('đọc khoảng ngày và nhiều đoạn', () => {
    const slots = parseOpeningHours('T2-T6 07:00-22:00; T7-CN 06:30-23:00');
    expect(slots).toHaveLength(7);
    expect(slots.find((s) => s.day === 0)).toEqual({ day: 0, open: '06:30', close: '23:00' });
    expect(slots.find((s) => s.day === 1)).toEqual({ day: 1, open: '07:00', close: '22:00' });
  });
  it('đọc nhiều ca trong ngày, ngày nghỉ và 24h', () => {
    expect(parseOpeningHours('T2-CN 06:30-11:00,14:00-22:00')).toHaveLength(14);
    expect(parseOpeningHours('T2 Đóng; T3-CN 24h')).toHaveLength(6);
  });
  it('báo lỗi định dạng sai', () => {
    expect(() => parseOpeningHours('sáng tới tối')).toThrow(OpeningHoursParseError);
    expect(() => parseOpeningHours('T2-T6 7h-22h')).toThrow(OpeningHoursParseError);
  });
});

describe('isOpenAt', () => {
  it('kiểm tra trong giờ và ca qua nửa đêm', () => {
    const slots = parseOpeningHours('T6-T7 18:00-02:00');
    expect(isOpenAt(slots, 5, 20 * 60)).toBe(true); // Thứ sáu 20:00
    expect(isOpenAt(slots, 6, 60)).toBe(true); // Rạng sáng thứ bảy 01:00
    expect(isOpenAt(slots, 5, 10 * 60)).toBe(false);
  });
});

describe('openStatus', () => {
  // 2026-10-07 là thứ Tư. Giờ Việt Nam = UTC + 7.
  const vn = (iso: string) => new Date(iso);
  const daily = parseOpeningHours('T2-CN 07:00-22:00');

  it('chưa có giờ thì không biết', () => {
    expect(openStatus([], vn('2026-10-07T03:00:00Z'))).toEqual({ kind: 'unknown' });
  });
  it('đang mở thì báo giờ đóng', () => {
    expect(openStatus(daily, vn('2026-10-07T03:00:00Z'))).toEqual({ kind: 'open', closesAt: '22:00' }); // T4 10:00
  });
  it('trước giờ mở thì mở lại hôm nay; sau giờ đóng thì mở lại ngày mai', () => {
    expect(openStatus(daily, vn('2026-10-06T23:00:00Z'))).toEqual({ kind: 'closed', opensAt: '07:00', day: 3, inDays: 0 }); // T4 06:00
    expect(openStatus(daily, vn('2026-10-07T15:30:00Z'))).toEqual({ kind: 'closed', opensAt: '07:00', day: 4, inDays: 1 }); // T4 22:30
  });
  it('nghỉ giữa hai ca thì báo giờ mở ca sau', () => {
    const slots = parseOpeningHours('T2-CN 06:30-11:00,14:00-22:00');
    expect(openStatus(slots, vn('2026-10-07T05:00:00Z'))).toEqual({ kind: 'closed', opensAt: '14:00', day: 3, inDays: 0 }); // T4 12:00
  });
  it('gộp hai ca nối tiếp nhau', () => {
    const slots = parseOpeningHours('T2-CN 06:00-11:00,11:00-22:00');
    expect(openStatus(slots, vn('2026-10-07T03:00:00Z'))).toEqual({ kind: 'open', closesAt: '22:00' });
  });
  it('ca qua nửa đêm và ca qua cuối tuần (thứ Bảy sang Chủ nhật)', () => {
    expect(openStatus(parseOpeningHours('T6-T7 18:00-02:00'), vn('2026-10-09T18:00:00Z'))).toEqual({ kind: 'open', closesAt: '02:00' }); // rạng sáng T7 01:00
    expect(openStatus(parseOpeningHours('T7 20:00-02:00'), vn('2026-10-10T18:00:00Z'))).toEqual({ kind: 'open', closesAt: '02:00' }); // rạng sáng CN 01:00
  });
  it('mở 24/7 thì không có giờ đóng', () => {
    expect(openStatus(parseOpeningHours('T2-CN 24h'), vn('2026-10-07T03:00:00Z'))).toEqual({ kind: 'open', closesAt: null });
  });
  it('đóng lúc nửa đêm hiện 00:00; ca 00:00-00:00 coi như mở cả ngày đó', () => {
    expect(openStatus(parseOpeningHours('T4 18:00-24:00'), vn('2026-10-07T13:00:00Z'))).toEqual({ kind: 'open', closesAt: '00:00' }); // T4 20:00
    expect(openStatus([{ day: 3, open: '00:00', close: '00:00' }], vn('2026-10-07T03:00:00Z'))).toEqual({ kind: 'open', closesAt: '00:00' });
  });
  it('nghỉ thứ Hai thì tối Chủ nhật báo mở lại thứ Ba, sau 2 ngày', () => {
    const slots = parseOpeningHours('T2 Đóng; T3-CN 07:00-22:00');
    expect(openStatus(slots, vn('2026-10-11T16:00:00Z'))).toEqual({ kind: 'closed', opensAt: '07:00', day: 2, inDays: 2 }); // CN 23:00
  });
  it('tính theo giờ Việt Nam dù máy chủ chạy UTC', () => {
    // 17:30 UTC thứ Ba là 00:30 thứ Tư ở Việt Nam.
    expect(openStatus([{ day: 3, open: '00:00', close: '06:00' }], vn('2026-10-06T17:30:00Z'))).toEqual({ kind: 'open', closesAt: '06:00' });
  });
});
