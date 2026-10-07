import { AdminSession } from '@ranhduong/contracts';
import { FetchError } from 'ofetch';
import { ref } from 'vue';
import { api } from '@/shared/api/client';

export type SessionState =
  | { status: 'signed-in'; session: AdminSession }
  | { status: 'signed-out' }
  | { status: 'forbidden' }
  | { status: 'unavailable' };

/** Phiên hiện tại; thanh bên đọc để hiện email. */
export const sessionState = ref<SessionState>({ status: 'signed-out' });

/** Hỏi API phiên hiện tại. 401: chưa đăng nhập; 403: email đã bị bỏ khỏi danh sách; lỗi khác: không kết nối được. */
export async function loadSession(): Promise<SessionState> {
  sessionState.value = await fetchSession();
  return sessionState.value;
}

async function fetchSession(): Promise<SessionState> {
  try {
    return { status: 'signed-in', session: AdminSession.parse(await api('/auth/session')) };
  } catch (err) {
    if (err instanceof FetchError && err.statusCode === 401) return { status: 'signed-out' };
    if (err instanceof FetchError && err.statusCode === 403) return { status: 'forbidden' };
    return { status: 'unavailable' };
  }
}
