/**
 * Sau một lần deploy, file chunk cũ không còn; khi phiên Cloudflare Access hết hạn, request chunk bị chuyển sang trang
 * đăng nhập Access. Cả hai làm import() của route lỗi; tải lại toàn trang tới đúng trang đích là đủ (S26).
 */
const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export const CHUNK_RELOAD_KEY = 'rd-admin:chunk-reload';
/** Trong khoảng này mà cùng trang lại lỗi thì coi như bản deploy hỏng, không tải lại nữa. */
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(error.message);
}

/** Được tải lại thì ghi lại trang đích và trả true; không có chỗ ghi thì trả false để không lặp vô hạn. */
export function claimChunkReload(target: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null, now: number): boolean {
  if (!storage) return false;
  try {
    const last = parseLast(storage.getItem(CHUNK_RELOAD_KEY));
    if (last && last.target === target && now - last.at < CHUNK_RELOAD_WINDOW_MS) return false;
    storage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ target, at: now }));
    return true;
  } catch {
    return false;
  }
}

function parseLast(raw: string | null): { target: string; at: number } | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && 'target' in value && 'at' in value
      && typeof value.target === 'string' && typeof value.at === 'number') {
      return { target: value.target, at: value.at };
    }
  } catch {
    // Bản lưu hỏng: coi như chưa tải lại.
  }
  return null;
}
