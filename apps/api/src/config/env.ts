import { z } from 'zod';

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3001),
  MONGODB_URI: z.string().min(1),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
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
