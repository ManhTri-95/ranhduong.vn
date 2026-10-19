import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_STYLE_URL } from '../src/shared/config/defaults';
import { pagesHeaders, parsePagesEnv } from './pages';

const STAGING = {
  VITE_API_BASE: 'https://api.staging.ranhduong.vn/v1',
  VITE_WEB_BASE: 'https://staging.ranhduong.vn/',
  VITE_MEDIA_BASE: 'https://media.staging.ranhduong.vn/',
};

describe('parsePagesEnv', () => {
  it('thiếu biến bắt buộc thì dừng và nêu đủ tên biến', () => {
    expect(() => parsePagesEnv({})).toThrow(/VITE_API_BASE[\s\S]*VITE_WEB_BASE[\s\S]*VITE_MEDIA_BASE/);
    expect(() => parsePagesEnv({ ...STAGING, VITE_API_BASE: '   ' })).toThrow(/VITE_API_BASE/);
    expect(() => parsePagesEnv({ ...STAGING, VITE_MEDIA_BASE: 'media.ranhduong.vn' })).toThrow(/VITE_MEDIA_BASE/);
    expect(() => parsePagesEnv({ ...STAGING, VITE_UPLOAD_ORIGIN: 'https://x.r2.cloudflarestorage.com/bucket' })).toThrow(/VITE_UPLOAD_ORIGIN/);
  });

  it('biến tuỳ chọn để trống (biến GitHub chưa đặt) thì dùng mặc định; bỏ / cuối', () => {
    expect(parsePagesEnv({ ...STAGING, VITE_MAP_STYLE_URL: '', VITE_UPLOAD_ORIGIN: '' })).toEqual({
      apiBase: 'https://api.staging.ranhduong.vn/v1',
      webBase: 'https://staging.ranhduong.vn',
      mediaBase: 'https://media.staging.ranhduong.vn',
      mapStyleUrl: DEFAULT_MAP_STYLE_URL,
      uploadOrigin: 'https://*.r2.cloudflarestorage.com',
    });
  });
});

describe('pagesHeaders', () => {
  it('_headers: CSP chỉ mở đúng origin cần, không eval, chặn index và nhúng khung', () => {
    const text = pagesHeaders(parsePagesEnv(STAGING));
    expect(text.startsWith('/*\n')).toBe(true);
    expect(text).toContain("connect-src 'self' https://api.staging.ranhduong.vn https://*.r2.cloudflarestorage.com https://tiles.openfreemap.org;");
    expect(text).toContain("img-src 'self' data: blob: https://media.staging.ranhduong.vn;");
    expect(text).toContain("script-src 'self';");
    expect(text).toContain("frame-ancestors 'none'");
    expect(text).not.toContain('unsafe-eval');
    expect(text).toContain('  X-Robots-Tag: noindex, nofollow\n');
    expect(text).not.toMatch(/Cache-Control/i);
    for (const line of text.split('\n')) expect(line.length).toBeLessThan(2000);
  });

  it('style bản đồ ở domain khác thì thêm origin đó vào connect-src', () => {
    const text = pagesHeaders(parsePagesEnv({ ...STAGING, VITE_MAP_STYLE_URL: 'https://staging.ranhduong.vn/maps/notebook/style.json' }));
    expect(text).toContain("connect-src 'self' https://api.staging.ranhduong.vn https://*.r2.cloudflarestorage.com https://staging.ranhduong.vn https://tiles.openfreemap.org;");
  });
});
