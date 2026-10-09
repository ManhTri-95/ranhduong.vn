import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it.each([undefined, null, '', '   ', ['ca phe', 'an uong'], [null]])('không có một từ khoá thì để trống: %j', (value) => {
    expect(parseSearchQuery(value)).toBe('');
  });

  it('bỏ khoảng trắng ngoài, giữ chữ có dấu và chữ hoa để hiện lại trong ô tìm', () => {
    expect(parseSearchQuery('  QUÁN Giả Lập Một  ')).toBe('QUÁN Giả Lập Một');
  });

  it('giữ ký tự đặc biệt như văn bản, không xử lý như regex', () => {
    expect(parseSearchQuery(' (.* ')).toBe('(.*');
  });

  it('cắt đoạn dài để query gửi API vẫn hợp lệ', () => {
    expect(parseSearchQuery(`  ${'a'.repeat(101)}  `)).toBe('a'.repeat(100));
    expect(parseSearchQuery('a'.repeat(100))).toBe('a'.repeat(100));
  });

  it('không cắt giữa cặp surrogate của emoji ở ranh giới 100 ký tự', () => {
    expect(parseSearchQuery(`${'a'.repeat(99)}😀`)).toBe('a'.repeat(99));
    expect(parseSearchQuery(`${'a'.repeat(98)}😀`)).toBe(`${'a'.repeat(98)}😀`);
    expect(parseSearchQuery('😀'.repeat(51))).toBe('😀'.repeat(50));
  });
});
