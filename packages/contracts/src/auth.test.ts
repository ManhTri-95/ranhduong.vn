import { describe, expect, it } from 'vitest';
import { AdminSession, OAuthCallbackQuery, parseReturnTo } from './auth.js';

// contracts không nạp kiểu DOM hay Node (`types: []`); URL có sẵn khi chạy test bằng Node, chỉ cần khai báo kiểu ở đây.
declare const URL: new (input: string, base: string) => { origin: string };

describe('parseReturnTo', () => {
  it.each(['/', '/dia-diem', '/dia-diem/66f0c0ffee0000000000000a?tab=anh#gio', '/dia-diem/%2F%2Fgia-lap'])(
    'giữ đường dẫn nội bộ %s',
    (path) => {
      expect(parseReturnTo(path)).toBe(path);
    },
  );

  it.each([
    ['thiếu', undefined],
    ['chuỗi rỗng', ''],
    ['tham số lặp (Express đọc thành mảng)', ['/dia-diem', '/lich-trinh']],
    ['URL tuyệt đối', 'https://gia-lap.example/dia-diem'],
    ['bắt đầu bằng //', '//gia-lap.example'],
    ['có dấu gạch ngược', '/\\gia-lap.example'],
    ['tab giữa hai dấu gạch', '/\t/gia-lap.example'],
    ['xuống dòng', '/\n/gia-lap.example'],
    ['khoảng trắng', '/dia diem'],
    ['javascript:', 'javascript:alert(1)'],
    ['dài quá 512 ký tự', `/${'a'.repeat(512)}`],
  ])('đưa về "/" khi %s', (_label, raw) => {
    expect(parseReturnTo(raw)).toBe('/');
  });

  it('kết quả ghép với URL admin luôn giữ nguyên origin', () => {
    const base = 'https://admin.gia-lap.example';
    for (const raw of ['/', '/a', '//x', '/\\x', '/\t/x', '/.//x', '/..//x', '/%5C%5Cx']) {
      expect(new URL(parseReturnTo(raw), base).origin).toBe(base);
    }
  });
});

describe('OAuthCallbackQuery', () => {
  it('nhận query thành công và query khi người dùng bấm Huỷ ở Google', () => {
    expect(OAuthCallbackQuery.parse({ state: 's', code: 'c', scope: 'email openid' })).toEqual({ state: 's', code: 'c' });
    expect(OAuthCallbackQuery.parse({ state: 's', error: 'access_denied' })).toEqual({ state: 's', error: 'access_denied' });
  });

  it('từ chối khi thiếu state, state quá dài hoặc tham số bị lặp', () => {
    expect(OAuthCallbackQuery.safeParse({ code: 'c' }).success).toBe(false);
    expect(OAuthCallbackQuery.safeParse({ state: 's'.repeat(257), code: 'c' }).success).toBe(false);
    expect(OAuthCallbackQuery.safeParse({ state: ['s1', 's2'], code: 'c' }).success).toBe(false);
  });
});

describe('AdminSession', () => {
  it('chỉ trả email ra ngoài, bỏ các trường nội bộ của phiên', () => {
    expect(
      AdminSession.parse({ email: 'quan-tri-gia-lap@example.com', subject: 'google-sub-gia-lap', createdAt: '2026-10-07T03:00:00.000Z' }),
    ).toEqual({ email: 'quan-tri-gia-lap@example.com' });
  });
});
