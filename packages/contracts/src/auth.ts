import { z } from 'zod';

/** Mã lỗi đăng nhập API gửi lại cho admin qua `/dang-nhap?error=`. */
export const LoginError = z.enum(['not_allowed', 'expired', 'failed']);
export type LoginError = z.infer<typeof LoginError>;

// Ký tự điều khiển và khoảng trắng (trình duyệt bỏ tab, xuống dòng khi đọc URL nên '/\t/x' thành '//x'),
// DEL và '\' (trình duyệt coi '\' như '/').
const hasUnsafeChar = (s: string) =>
  [...s].some((ch) => (ch.codePointAt(0) ?? 0) <= 0x20 || ch === '\u007f' || ch === '\\');

/**
 * Đường dẫn nội bộ để quay lại sau khi đăng nhập (ADR 0009): bắt đầu bằng đúng một '/',
 * không có khoảng trắng, ký tự điều khiển hay '\'. Nhờ vậy không thể chuyển hướng sang trang khác.
 */
export const ReturnToPath = z
  .string()
  .max(512)
  .refine((s) => s.startsWith('/') && !s.startsWith('//') && !hasUnsafeChar(s), 'returnTo phải là đường dẫn nội bộ');
export type ReturnToPath = z.infer<typeof ReturnToPath>;

/** Đọc returnTo từ query; thiếu hoặc không an toàn thì về '/'. */
export function parseReturnTo(raw: unknown): ReturnToPath {
  const parsed = ReturnToPath.safeParse(raw);
  return parsed.success ? parsed.data : '/';
}

/** Query Google gửi về `/auth/google/callback`: thành công có `code`, người dùng huỷ thì có `error`. */
export const OAuthCallbackQuery = z.object({
  state: z.string().min(1).max(256),
  code: z.string().min(1).optional(),
  error: z.string().optional(),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuery>;

/** Phiên admin trả về từ `GET /auth/session`. */
export const AdminSession = z.object({ email: z.email() });
export type AdminSession = z.infer<typeof AdminSession>;
