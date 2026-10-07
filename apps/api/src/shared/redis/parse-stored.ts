import type { z } from 'zod';

/** Đọc JSON đã lưu trong Redis và kiểm bằng schema; không có, JSON hỏng hoặc sai schema thì trả null. */
export function parseStored<T>(schema: z.ZodType<T>, raw: string | null): T | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
