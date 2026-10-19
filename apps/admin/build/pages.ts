import type { Plugin } from 'vite';
import { z } from 'zod';
import { DEFAULT_MAP_STYLE_URL } from '../src/shared/config/defaults';

/** Biến build của bản deploy Cloudflare Pages (S26), đã kiểm và chuẩn hoá. */
export interface PagesEnv {
  apiBase: string;
  webBase: string;
  mediaBase: string;
  mapStyleUrl: string;
  /** Origin nhận PUT presigned (R2 S3 API); có thể là wildcard `https://*.r2.cloudflarestorage.com`. */
  uploadOrigin: string;
}

/** Tile, glyph và sprite của OpenFreeMap luôn tải từ đây, kể cả khi style nằm ở domain khác. */
const OPENFREEMAP_ORIGIN = 'https://tiles.openfreemap.org';
const DEFAULT_UPLOAD_ORIGIN = 'https://*.r2.cloudflarestorage.com';

// Biến GitHub chưa đặt cho ra '': coi như chưa đặt.
const blank = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);
const httpUrl = z.preprocess(
  blank,
  z.url({ protocol: /^https?$/, error: 'Phải là URL http(s) đầy đủ' }).transform((s) => s.replace(/\/+$/, '')),
);
const PagesEnvSchema = z.object({
  VITE_API_BASE: httpUrl,
  VITE_WEB_BASE: httpUrl,
  VITE_MEDIA_BASE: httpUrl,
  VITE_MAP_STYLE_URL: z.preprocess(blank, z.url({ protocol: /^https?$/, error: 'Phải là URL http(s) đầy đủ' }).default(DEFAULT_MAP_STYLE_URL)),
  VITE_UPLOAD_ORIGIN: z.preprocess(
    blank,
    z.string().regex(/^https?:\/\/(\*\.)?[a-z0-9.-]+(:\d+)?$/, 'Phải là origin, ví dụ https://*.r2.cloudflarestorage.com').default(DEFAULT_UPLOAD_ORIGIN),
  ),
});

/** Kiểm biến `VITE_*` khi build `--mode pages`; thiếu hoặc sai thì dừng build, không lặng lẽ trỏ về localhost. */
export function parsePagesEnv(source: Record<string, string | undefined>): PagesEnv {
  const parsed = PagesEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Thiếu hoặc sai biến build cho Cloudflare Pages:\n${issues}`);
  }
  const env = parsed.data;
  return {
    apiBase: env.VITE_API_BASE,
    webBase: env.VITE_WEB_BASE,
    mediaBase: env.VITE_MEDIA_BASE,
    mapStyleUrl: env.VITE_MAP_STYLE_URL,
    uploadOrigin: env.VITE_UPLOAD_ORIGIN,
  };
}

/**
 * Thay `import.meta.env.VITE_*` trong bundle bằng giá trị đã kiểm và chuẩn hoá, để app dùng đúng thứ CSP mở
 * (ví dụ `VITE_API_BASE` có `/` cuối sẽ làm link đăng nhập thành `/v1//auth/...`).
 */
export function pagesDefine(env: PagesEnv): Record<string, string> {
  return {
    'import.meta.env.VITE_API_BASE': JSON.stringify(env.apiBase),
    'import.meta.env.VITE_WEB_BASE': JSON.stringify(env.webBase),
    'import.meta.env.VITE_MEDIA_BASE': JSON.stringify(env.mediaBase),
    'import.meta.env.VITE_MAP_STYLE_URL': JSON.stringify(env.mapStyleUrl),
  };
}

const sources = (...values: string[]) => [...new Set(values)].join(' ');

/** Nội dung `_headers` cho mọi đường dẫn của admin; không đặt Cache-Control để giữ mặc định revalidate của Pages. */
export function pagesHeaders(env: PagesEnv): string {
  const origin = (url: string) => new URL(url).origin;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${sources("'self'", 'data:', 'blob:', origin(env.mediaBase))}`,
    `connect-src ${sources("'self'", origin(env.apiBase), env.uploadOrigin, origin(env.mapStyleUrl), OPENFREEMAP_ORIGIN)}`,
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: same-origin',
    '  X-Robots-Tag: noindex, nofollow',
    '',
  ].join('\n');
}

/** Sinh `dist/_headers` khi build cho Cloudflare Pages. */
export function pagesHeadersPlugin(env: PagesEnv): Plugin {
  return {
    name: 'rd-pages-headers',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: pagesHeaders(env) });
    },
  };
}
