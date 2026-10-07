import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies';

describe('readCookie', () => {
  it('đọc đúng cookie theo tên, bỏ khoảng trắng', () => {
    expect(readCookie('sid=abc', 'sid')).toBe('abc');
    expect(readCookie('a=1;  sid=abc ; b=2', 'sid')).toBe('abc');
  });
  it('không nhầm với cookie có tên chứa tên cần tìm', () => {
    expect(readCookie('xsid=sai; sid_staging=sai; sid=dung', 'sid')).toBe('dung');
  });
  it('giữ dấu = trong giá trị và decode %XX', () => {
    expect(readCookie('t=a=b=c', 't')).toBe('a=b=c');
    expect(readCookie('t=a%20b', 't')).toBe('a b');
    expect(readCookie('t=%E0%A4%A', 't')).toBe('%E0%A4%A');
  });
  it('không có header hoặc không có cookie thì trả undefined', () => {
    expect(readCookie(undefined, 'sid')).toBeUndefined();
    expect(readCookie('', 'sid')).toBeUndefined();
    expect(readCookie('a=1; sidabc', 'sid')).toBeUndefined();
  });
});
