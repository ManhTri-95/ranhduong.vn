import { describe, expect, it } from 'vitest';
import { tripCalendar } from './calendar';

describe('tripCalendar', () => {
  it('đánh số ngày, thứ và MM-DD qua cuối năm', () => {
    expect(tripCalendar('2026-12-30', 3)).toEqual([
      { day: 1, date: '2026-12-30', weekday: 3, monthDay: '12-30' },
      { day: 2, date: '2026-12-31', weekday: 4, monthDay: '12-31' },
      { day: 3, date: '2027-01-01', weekday: 5, monthDay: '01-01' },
    ]);
  });
  it('qua cuối tháng Hai năm nhuận', () => {
    expect(tripCalendar('2028-02-28', 2).map((d) => d.date)).toEqual(['2028-02-28', '2028-02-29']);
  });
});
