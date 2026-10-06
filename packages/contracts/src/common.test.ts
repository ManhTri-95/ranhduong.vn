import { describe, expect, it } from 'vitest';
import { HexColor, MonthDay, ObjectIdString, Slug } from './common.js';

describe('Slug', () => {
  it('nhận slug không dấu, chữ thường, gạch nối', () => {
    for (const s of ['da-lat', 'doi-che-cau-dat', 'top10', 'a']) expect(Slug.safeParse(s).success, s).toBe(true);
  });
  it('từ chối chữ hoa, dấu, khoảng trắng, gạch nối thừa', () => {
    for (const s of ['', 'Da-lat', 'đà-lạt', 'da lat', '-da-lat', 'da-lat-', 'da--lat', 'da_lat']) {
      expect(Slug.safeParse(s).success, s).toBe(false);
    }
  });
});

describe('ObjectIdString', () => {
  it('nhận 24 ký tự hex thường', () => {
    expect(ObjectIdString.safeParse('0123456789abcdef01234567').success).toBe(true);
  });
  it('từ chối sai độ dài hoặc ký tự lạ', () => {
    for (const s of ['0123456789abcdef0123456', '0123456789abcdef012345678', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
      expect(ObjectIdString.safeParse(s).success, s).toBe(false);
    }
  });
});

describe('HexColor', () => {
  it('nhận #RRGGBB', () => {
    expect(HexColor.safeParse('#E9B824').success).toBe(true);
  });
  it('từ chối thiếu # hoặc sai độ dài, ký tự', () => {
    for (const s of ['E9B824', '#E9B82', '#E9B8244', '#GGGGGG']) expect(HexColor.safeParse(s).success, s).toBe(false);
  });
});

describe('MonthDay', () => {
  it('nhận MM-DD có thật, kể cả 29/2', () => {
    for (const s of ['01-01', '10-15', '12-31', '02-29']) expect(MonthDay.safeParse(s).success, s).toBe(true);
  });
  it('từ chối tháng, ngày ngoài khoảng, ngày không tồn tại hoặc sai định dạng', () => {
    for (const s of ['00-10', '13-01', '10-00', '10-32', '02-30', '04-31', '1-05', '2026-10-15']) {
      expect(MonthDay.safeParse(s).success, s).toBe(false);
    }
  });
});
