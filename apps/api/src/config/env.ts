import { z } from 'zod';
import { isIP } from 'node:net';

const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);
const httpUrl = (fallback: string) =>
  z.url({ protocol: /^https?$/ }).default(fallback).transform((s) => s.replace(/\/+$/, ''));
/** Trình duyệt gửi Origin dạng `https://host[:port]`, chữ thường, không có `/` cuối; so sánh chính xác nên phải chuẩn hoá trước (S26). */
const webOrigin = z.string().transform((value, ctx) => {
  const url = URL.canParse(value) ? new URL(value) : null;
  // URL chấp nhận host có `*`, nhưng CORS/OriginGuard so sánh chính xác nên wildcard không bao giờ khớp.
  if (url && (url.protocol === 'http:' || url.protocol === 'https:') && url.pathname === '/' && !url.search && !url.hash
    && !url.username && !url.password && !url.hostname.includes('*')) {
    return url.origin;
  }
  ctx.addIssue({ code: 'custom', message: `"${value}" không phải origin http(s) cụ thể, ví dụ https://admin.ranhduong.vn` });
  return z.NEVER;
});

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3101),
  MONGODB_URI: z.string().min(1),
  /** S13: Atlas Search index đã sẵn sàng; local để trống để tìm trong bộ nhớ. */
  PLACE_SEARCH_INDEX: z.string().default('').transform((s) => s.trim() || undefined),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** S24: WeatherAPI Free; chỉ API đọc key. Chưa có key thì ẩn thời tiết. */
  WEATHERAPI_KEY: z.string().default('').transform((value) => value.trim() || undefined),
  TRUSTED_PROXY_CIDRS: z.string().default('').transform(csv).pipe(z.array(z.string().refine((value) => {
    const [ip, bits, extra] = value.split('/');
    const version = isIP(ip ?? '');
    return version > 0 && extra === undefined && (bits === undefined || /^\d+$/.test(bits) && Number(bits) <= (version === 4 ? 32 : 128));
  }, 'Proxy phải là IP hoặc CIDR hợp lệ'))),
  /** Các nguồn được gọi API kèm cookie: web khách và admin, cách nhau bằng dấu phẩy. */
  WEB_ORIGINS: z.string().default('http://localhost:3100,http://localhost:5174').transform(csv)
    .pipe(z.array(webOrigin).min(1, 'Cần ít nhất một nguồn')),
  /** Email được vào admin (S04), cách nhau bằng dấu phẩy, không phân biệt hoa thường. Để trống thì không ai vào được. */
  ADMIN_EMAILS: z.string().default('').transform((s) => csv(s).map((e) => e.toLowerCase())),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  /** URL công khai của API, dùng để tạo redirect_uri cho Google; là https thì cookie có cờ Secure. */
  API_PUBLIC_URL: httpUrl('http://localhost:3101'),
  /** URL app admin: nơi chuyển về sau khi đăng nhập. */
  ADMIN_URL: httpUrl('http://localhost:5174'),
  /** Domain cookie phiên: production `.ranhduong.vn`, staging `.staging.ranhduong.vn`, local để trống. */
  SESSION_COOKIE_DOMAIN: z.string().default('').transform((s) => s.trim() || undefined),
  /** Tên cookie phiên. Staging phải đặt khác production, vì cookie `.ranhduong.vn` cũng được gửi tới api.staging. */
  SESSION_COOKIE_NAME: z.string().regex(/^[a-z_]+$/).default('sid'),
  R2_ENDPOINT: httpUrl('http://localhost:9000'),
  R2_ACCESS_KEY_ID: z.string().min(1).default('minio'),
  R2_SECRET_ACCESS_KEY: z.string().min(1).default('minio12345'),
  R2_BUCKET: z.string().min(1).default('ranhduong-media'),
  /** Ảnh gốc không được công khai: bucket riêng, không gắn custom domain hoặc r2.dev. */
  R2_UPLOAD_BUCKET: z.string().min(1).default('ranhduong-uploads'),
}).superRefine((env, ctx) => {
  if (env.R2_BUCKET === env.R2_UPLOAD_BUCKET) {
    ctx.addIssue({ code: 'custom', path: ['R2_UPLOAD_BUCKET'], message: 'Bucket ảnh gốc phải khác bucket ảnh công khai' });
  }
});

export type Env = z.infer<typeof EnvSchema>;

const DbEnvSchema = z.object({ MONGODB_URI: EnvSchema.shape.MONGODB_URI });
export type DbEnv = z.infer<typeof DbEnvSchema>;

const OsmEnvSchema = DbEnvSchema.extend({
  OVERPASS_URL: z.httpUrl().default('https://overpass-api.de/api/interpreter'),
});
export type OsmEnv = z.infer<typeof OsmEnvSchema>;

function invalidEnv(error: z.ZodError): never {
  const issues = error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
}

/** Đọc và kiểm tra biến môi trường một lần khi khởi động; sai thì dừng ngay với lỗi rõ ràng. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) invalidEnv(parsed.error);
  return parsed.data;
}

/** Chỉ biến cần cho lệnh seed (kết nối MongoDB), để seed chạy được khi chưa cấu hình Google. */
export function loadDbEnv(source: NodeJS.ProcessEnv = process.env): DbEnv {
  const parsed = DbEnvSchema.safeParse(source);
  if (!parsed.success) invalidEnv(parsed.error);
  return parsed.data;
}

/** The import CLI does not need OAuth, Redis or R2 configuration. */
export function loadOsmEnv(source: NodeJS.ProcessEnv = process.env): OsmEnv {
  const parsed = OsmEnvSchema.safeParse(source);
  if (!parsed.success) invalidEnv(parsed.error);
  return parsed.data;
}

export const ENV = Symbol('ENV');
