import { sessionState } from '@/entities/session';
import { API_BASE, api } from '@/shared/api/client';

/** URL bắt đầu đăng nhập Google. Mở bằng điều hướng toàn trang để API đặt cookie rồi chuyển sang Google. */
export function googleLoginUrl(returnTo: string): string {
  const url = new URL(`${API_BASE}/auth/google/start`);
  url.searchParams.set('returnTo', returnTo);
  return url.toString();
}

/** Đăng xuất: API xoá phiên trong Redis và xoá cookie. */
export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' });
  sessionState.value = { status: 'signed-out' };
}
