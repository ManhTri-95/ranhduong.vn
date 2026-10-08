import { describe, expect, it } from 'vitest';
import {
  formatOpeningHours,
  isOpenAt,
  OpeningHoursParseError,
  openingHoursIssues,
  OpeningSlot,
  openStatus,
  parseOpeningHours,
  WEEK_DAYS,
} from './opening-hours.js';

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

describe('parseOpeningHours: giờ phải có thật', () => {
  it('nhận 24:00 làm giờ đóng, không nhận làm giờ mở', () => {
    expect(parseOpeningHours('T2 07:00-24:00')).toEqual([{ day: 1, open: '07:00', close: '24:00' }]);
    expect(() => parseOpeningHours('T2 24:00-02:00')).toThrow(OpeningHoursParseError);
  });
  it('không nhận giờ quá 24:00, phút quá 59 hoặc thiếu số 0 đầu', () => {
    for (const text of ['T2 07:00-24:30', 'T2 07:00-25:00', 'T2 07:60-22:00', 'T2 7:00-22:00']) {
      expect(() => parseOpeningHours(text), text).toThrow(OpeningHoursParseError);
    }
  });
  it('bỏ khoảng trắng quanh dấu gạch khi dán', () => {
    expect(parseOpeningHours('T2 07:00 - 22:00')).toEqual([{ day: 1, open: '07:00', close: '22:00' }]);
  });
});

describe('OpeningSlot', () => {
  it('giờ mở 00:00–23:59, giờ đóng 00:00–24:00', () => {
    expect(OpeningSlot.safeParse({ day: 1, open: '00:00', close: '24:00' }).success).toBe(true);
    expect(OpeningSlot.safeParse({ day: 1, open: '24:00', close: '02:00' }).success).toBe(false);
    expect(OpeningSlot.safeParse({ day: 1, open: '07:00', close: '99:99' }).success).toBe(false);
    expect(OpeningSlot.safeParse({ day: 1, open: '', close: '22:00' }).success).toBe(false);
  });
});

describe('WEEK_DAYS', () => {
  it('theo thứ tự T2 … CN, Chủ nhật là ngày 0', () => {
    expect(WEEK_DAYS.map((d) => d.label)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    expect(WEEK_DAYS.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe('openingHoursIssues', () => {
  it('chưa có ca nào', () => {
    expect(openingHoursIssues([])).toEqual(['Chưa có giờ mở cửa']);
  });
  it('hợp lệ, kể cả ca qua nửa đêm, mở cả ngày và hai ca nối tiếp', () => {
    expect(openingHoursIssues(parseOpeningHours('T2-T6 07:00-22:00; T7 18:00-02:00; CN 24h'))).toEqual([]);
    expect(openingHoursIssues(parseOpeningHours('T2 06:30-11:00,11:00-22:00'))).toEqual([]);
  });
  it('ca chưa nhập đủ hoặc sai giờ thì báo theo ngày, mỗi ngày một lần', () => {
    expect(
      openingHoursIssues([
        { day: 1, open: '', close: '22:00' },
        { day: 1, open: '07:00', close: '' },
      ]),
    ).toEqual(['T2: có ca chưa nhập đúng giờ mở, giờ đóng']);
  });
  it('giờ mở trùng giờ đóng', () => {
    expect(openingHoursIssues([{ day: 2, open: '07:00', close: '07:00' }])).toEqual(['T3: ca 07:00-07:00 có giờ mở trùng giờ đóng']);
  });
  it('hai ca chồng nhau trong một ngày, kể cả ca qua nửa đêm', () => {
    expect(openingHoursIssues(parseOpeningHours('T2 07:00-12:00,11:00-22:00'))).toEqual(['T2: hai ca chồng lên nhau']);
    expect(openingHoursIssues(parseOpeningHours('T2 07:00-23:00,22:00-02:00'))).toEqual(['T2: hai ca chồng lên nhau']);
  });
});

describe('formatOpeningHours', () => {
  it('gộp các ngày liền nhau cùng giờ, theo thứ tự T2 … CN', () => {
    expect(formatOpeningHours(parseOpeningHours('T7-CN 06:30-23:00; T2-T6 07:00-22:00'))).toBe('T2-T6 07:00-22:00; T7-CN 06:30-23:00');
  });
  it('ghi ngày nghỉ, 24h và nhiều ca', () => {
    expect(formatOpeningHours(parseOpeningHours('T2 Đóng; T3-CN 06:30-11:00,14:00-22:00'))).toBe('T2 Đóng; T3-CN 06:30-11:00,14:00-22:00');
    expect(formatOpeningHours(parseOpeningHours('T2-CN 24h'))).toBe('T2-CN 24h');
  });
  it('chưa có ca thì chuỗi rỗng', () => {
    expect(formatOpeningHours([])).toBe('');
  });
  it('đọc lại ra đúng các ca ban đầu', () => {
    for (const text of ['T2-T6 07:00-22:00; T7-CN 06:30-23:00', 'T6-T7 18:00-02:00', 'T2,T4 07:00-11:00', 'CN 24h']) {
      const slots = parseOpeningHours(text);
      expect(parseOpeningHours(formatOpeningHours(slots)), text).toEqual(slots);
    }
  });
});
