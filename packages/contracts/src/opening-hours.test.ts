import { describe, expect, it } from 'vitest';
import { isOpenAt, parseOpeningHours, OpeningHoursParseError } from './opening-hours.js';

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
