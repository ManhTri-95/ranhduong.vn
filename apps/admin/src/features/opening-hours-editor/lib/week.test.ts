import { parseOpeningHours } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { addShift, closedWeek, removeShift, setDayKind, slotsFromWeek, updateShift, weekFromSlots, WeekHours } from './week';

describe('weekFromSlots và slotsFromWeek', () => {
  it('đọc rồi ghi lại đúng các ca: nhiều ca, qua nửa đêm, 24h, ngày nghỉ', () => {
    const slots = parseOpeningHours('T2 Đóng; T3-T6 06:30-11:00,14:00-22:00; T7 18:00-02:00; CN 24h');
    const week = weekFromSlots(slots);
    expect(week[1]).toEqual({ kind: 'closed' });
    expect(week[2]).toEqual({ kind: 'shifts', shifts: [{ open: '06:30', close: '11:00' }, { open: '14:00', close: '22:00' }] });
    expect(week[0]).toEqual({ kind: 'allDay' });
    expect(slotsFromWeek(week)).toEqual(slots);
  });
  it('chưa có giờ thì cả tuần Đóng và không có ca nào', () => {
    expect(weekFromSlots([])).toEqual(closedWeek());
    expect(slotsFromWeek(closedWeek())).toEqual([]);
  });
});

describe('sửa bảng giờ', () => {
  it('chọn "Theo ca" hay thêm ca: ô giờ để trống, không điền sẵn giờ nào', () => {
    const week = addShift(setDayKind(closedWeek(), 1, 'shifts'), 1);
    expect(week[1]).toEqual({ kind: 'shifts', shifts: [{ open: '', close: '' }, { open: '', close: '' }] });
    expect(slotsFromWeek(week).every((s) => s.open === '' && s.close === '')).toBe(true);
  });
  it('sửa giờ một ca; xoá ca cuối thì ngày đó thành Đóng', () => {
    let week = setDayKind(closedWeek(), 3, 'shifts');
    week = updateShift(week, 3, 0, { open: '07:00' });
    week = updateShift(week, 3, 0, { close: '22:00' });
    expect(slotsFromWeek(week)).toEqual([{ day: 3, open: '07:00', close: '22:00' }]);
    expect(removeShift(week, 3, 0)[3]).toEqual({ kind: 'closed' });
  });
  it('mở cả ngày là một ca 00:00-24:00', () => {
    expect(slotsFromWeek(setDayKind(closedWeek(), 0, 'allDay'))).toEqual([{ day: 0, open: '00:00', close: '24:00' }]);
  });
  it('schema WeekHours nhận đúng 7 ngày (đọc lại bản lưu trên máy)', () => {
    expect(WeekHours.safeParse(closedWeek()).success).toBe(true);
    expect(WeekHours.safeParse(closedWeek().slice(1)).success).toBe(false);
  });
});
