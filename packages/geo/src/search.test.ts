import { describe, expect, it } from 'vitest';
import { matchScore, searchKey } from './search.js';

describe('searchKey', () => {
  it('chữ thường, bỏ dấu kể cả đ, bỏ ký tự đặc biệt, gộp khoảng trắng', () => {
    expect(searchKey('  Cà phê   Giả-Lập (Mây)! ')).toBe('ca phe gia lap may');
    expect(searchKey('Đồi')).toBe('doi');
  });
});

describe('matchScore', () => {
  const NAME = 'Cà phê Giả Lập Mây';

  it('3 khi tên bắt đầu bằng từ khoá, có dấu hay không dấu', () => {
    expect(matchScore('ca phe gia lap may', NAME)).toBe(3);
    expect(matchScore('Cà Phê', NAME)).toBe(3);
    expect(matchScore('ca ph', NAME)).toBe(3);
  });
  it('2 khi mọi từ khớp phần đầu một từ trong tên, không cần đúng thứ tự', () => {
    expect(matchScore('may', NAME)).toBe(2);
    expect(matchScore('MÂY gia', NAME)).toBe(2);
  });
  it('1 khi chỉ khớp nhờ tên khác hoặc chữ phụ như tên danh mục', () => {
    expect(matchScore('suong som', 'Quán Giả Lập', ['Sương Sớm Giả Lập'])).toBe(1);
    expect(matchScore('ca phe', 'Quán Giả Lập', ['Cà phê'])).toBe(1);
    expect(matchScore('gia lap ca phe', 'Quán Giả Lập', ['Cà phê'])).toBe(1);
  });
  it('0 khi có từ không khớp, từ khoá rỗng, chỉ có ký tự đặc biệt hoặc khớp giữa từ', () => {
    expect(matchScore('may xanh', NAME)).toBe(0);
    expect(matchScore('', NAME)).toBe(0);
    expect(matchScore('   ', NAME)).toBe(0);
    expect(matchScore('(.*)', NAME)).toBe(0);
    expect(matchScore('ay', NAME)).toBe(0);
  });
});
