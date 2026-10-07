/**
 * Lát 1 chưa phân vai trò: admin là email nằm trong ADMIN_EMAILS (loadEnv đã đổi sang chữ thường).
 * So khớp nguyên email, không gộp dấu chấm của Gmail, không so theo đuôi tên miền.
 */
export function isAllowedAdmin(email: string, allowed: readonly string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && allowed.includes(normalized);
}
