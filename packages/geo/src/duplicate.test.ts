import { describe, expect, it } from 'vitest';
import { findDuplicates, normalizeUrlForMatch, type DuplicateCandidate } from './duplicate.js';

// Dữ liệu giả, tên rõ là giả. Gần xích đạo 1° vĩ độ ≈ 111 195 m, nên north(m) cách gốc khoảng m mét.
const ORIGIN = { lat: 0, lng: 0 };
const north = (m: number) => ({ lat: m / 111_195, lng: 0 });
const candidate = (ref: string, name: string, extra: Partial<DuplicateCandidate<string>> = {}): DuplicateCandidate<string> => ({
  ref,
  name,
  aliases: [],
  ...extra,
});

describe('normalizeUrlForMatch', () => {
  it('bỏ giao thức, www., m., dấu / cuối, query, # và viết thường', () => {
    expect(normalizeUrlForMatch('https://www.facebook.com/GiaLap/')).toBe('facebook.com/gialap');
    expect(normalizeUrlForMatch('http://m.facebook.com/gialap?ref=bookmarks#top')).toBe('facebook.com/gialap');
    expect(normalizeUrlForMatch('facebook.com/gialap')).toBe('facebook.com/gialap');
  });
  it('trang Facebook chưa đặt tên (profile.php?id=…) giữ id; hai trang khác id không trùng', () => {
    expect(normalizeUrlForMatch('https://www.facebook.com/profile.php?id=100000000000001&ref=bookmarks')).toBe('facebook.com/profile.php?id=100000000000001');
    const subject = { name: 'Giả Lập Một', fanpage: 'https://facebook.com/profile.php?id=100000000000001' };
    const other = candidate('a', 'Giả Lập Khác', { fanpage: 'https://m.facebook.com/profile.php?id=100000000000002', location: north(5000) });
    expect(findDuplicates(subject, [other])).toEqual([]);
  });
});

describe('findDuplicates', () => {
  it('cùng tên chuẩn hoá, cách khoảng 50 m, không có ID chung: có thể trùng (luật tên giống)', () => {
    const [match, ...rest] = findDuplicates({ name: 'Cà phê Giả Lập Mây', location: ORIGIN }, [
      candidate('a', 'Giả Lập Mây Coffee', { location: north(50) }),
    ]);
    expect(rest).toEqual([]);
    expect(match).toMatchObject({ ref: 'a', level: 'possible' });
    expect(match?.score).toBeCloseTo(0.467, 2);
    expect(match?.distanceM).toBeCloseTo(50, 0);
  });
  it('trùng số điện thoại và cùng tên ở gần: rất có thể trùng', () => {
    const matches = findDuplicates({ name: 'Giả Lập Mây', location: ORIGIN, phone: '+84900000001' }, [
      candidate('a', 'Giả Lập Mây', { location: north(20), phone: '+84900000001' }),
    ]);
    expect(matches.map((m) => m.level)).toEqual(['likely']);
  });
  it('trùng fanpage dù khác cách viết link, ở xa và tên hơi khác: vẫn tính', () => {
    const matches = findDuplicates({ name: 'Giả Lập Một', location: ORIGIN, fanpage: 'https://www.facebook.com/GiaLapMot/' }, [
      candidate('a', 'Giả Lập Mới', { location: north(2000), fanpage: 'http://m.facebook.com/gialapmot?ref=x' }),
    ]);
    expect(matches.map((m) => m.level)).toEqual(['likely']);
  });
  it('khác tên ở gần, không có ID chung: không trùng', () => {
    expect(findDuplicates({ name: 'Giả Lập Mây', location: ORIGIN }, [candidate('a', 'Nhà hàng Zzz Khác', { location: north(10) })])).toEqual([]);
  });
  it('ngoài 150 m và không có ID chung: không phải ứng viên', () => {
    expect(findDuplicates({ name: 'Giả Lập Mây', location: ORIGIN }, [candidate('a', 'Giả Lập Mây', { location: north(200) })])).toEqual([]);
  });
  it('chi nhánh: cùng tên, cùng số điện thoại nhưng cách trên 300 m thì không coi là trùng', () => {
    const subject = { name: 'Giả Lập Mây', location: ORIGIN, phone: '+84900000001' };
    expect(findDuplicates(subject, [candidate('a', 'Giả Lập Mây', { location: north(500), phone: '+84900000001' })])).toEqual([]);
  });
  it('tên chỉ gồm từ chung (chuẩn hoá ra rỗng) không được tính là giống nhau', () => {
    expect(findDuplicates({ name: 'Cà phê', location: ORIGIN }, [candidate('a', 'Cafe', { location: north(10) })])).toEqual([]);
  });
  it('so cả tên khác (alias) của ứng viên', () => {
    const matches = findDuplicates({ name: 'Giả Lập Mây', location: ORIGIN }, [
      candidate('a', 'Tên Mới Giả Lập', { location: north(20), aliases: ['Giả Lập Mây'] }),
    ]);
    expect(matches.map((m) => m.ref)).toEqual(['a']);
  });
  it('chưa ghim: chỉ xét chỗ trùng ID, khoảng cách không có', () => {
    expect(findDuplicates({ name: 'Giả Lập Mây' }, [candidate('a', 'Giả Lập Mây', { location: ORIGIN })])).toEqual([]);
    const [match] = findDuplicates({ name: 'Giả Lập Mây', phone: '+84900000001' }, [
      candidate('a', 'Giả Lập Mây', { location: ORIGIN, phone: '+84900000001' }),
    ]);
    expect(match).toMatchObject({ ref: 'a', level: 'likely' });
    expect(match?.distanceM).toBeUndefined();
  });
  it('xếp điểm cao trước', () => {
    const matches = findDuplicates({ name: 'Giả Lập Mây', location: ORIGIN, phone: '+84900000001' }, [
      candidate('gan-ten', 'Giả Lập Mây', { location: north(100) }),
      candidate('cung-so', 'Giả Lập Mây', { location: north(30), phone: '+84900000001' }),
    ]);
    expect(matches.map((m) => m.ref)).toEqual(['cung-so', 'gan-ten']);
  });
});
