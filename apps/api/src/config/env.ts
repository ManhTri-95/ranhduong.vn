import { z } from 'zod';

const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);
const httpUrl = (fallback: string) =>
  z.url({ protocol: /^https?$/ }).default(fallback).transform((s) => s.replace(/\/+$/, ''));

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3101),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** Các nguồn được gọi API kèm cookie: web khách và admin, cách nhau bằng dấu phẩy. */
  WEB_ORIGINS: z.string().default('http://localhost:3100,http://localhost:5174').transform(csv),
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
