import { describe, expect, it } from 'vitest';
import { verifySourceOptions } from './verify-options';

describe('verifySourceOptions', () => {
  it('quán: "Quán đã xác nhận" là owner, "Chỉ dựa trên Facebook" là admin và nhắc nhãn chưa xác nhận', () => {
    const options = verifySourceOptions('cafe');
    expect(options.map((o) => [o.value, o.label])).toEqual([
      ['owner', 'Quán đã xác nhận'],
      ['admin', 'Chỉ dựa trên Facebook'],
    ]);
    expect(options[1]?.hint).toMatch(/chưa được quán xác nhận/);
    expect(verifySourceOptions('')).toEqual(options);
  });
  it('điểm tham quan: "Điểm công cộng" là admin, không hiện nhãn chưa xác nhận', () => {
    const options = verifySourceOptions('attraction');
    expect(options.map((o) => [o.value, o.label])).toEqual([
      ['admin', 'Điểm công cộng'],
      ['owner', 'Đơn vị quản lý đã xác nhận'],
    ]);
    expect(options.some((o) => /chưa được quán xác nhận/.test(o.hint))).toBe(false);
  });
});
