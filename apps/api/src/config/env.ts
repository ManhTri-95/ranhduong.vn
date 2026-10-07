import { z } from 'zod';

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3101),
  MONGODB_URI: z.string().min(1),
  /** Các nguồn được gọi API kèm cookie: web khách và admin, cách nhau bằng dấu phẩy. */
  WEB_ORIGINS: z
    .string()
    .default('http://localhost:3100,http://localhost:5174')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)),
});

export type Env = z.infer<typeof EnvSchema>;

/** Đọc và kiểm tra biến môi trường một lần khi khởi động; sai thì dừng ngay với lỗi rõ ràng. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
