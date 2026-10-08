import { z } from 'zod';

/** Phần Storage dùng tới; test truyền bản giả. */
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Bản lưu trên máy: giá trị và thời điểm lưu (ISO, UTC). */
export interface LocalDraft<T> {
  savedAt: string;
  value: T;
}

const Envelope = z.object({ savedAt: z.iso.datetime(), value: z.unknown() });

/** localStorage của trình duyệt; bị chặn (chế độ riêng tư, chính sách) thì null. */
function browserStorage(): DraftStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Đọc bản lưu trên máy; không có, hỏng, sai dạng hoặc bị chặn thì null (không ném lỗi). */
export function readLocalDraft<T>(key: string, schema: z.ZodType<T>, storage: DraftStorage | null = browserStorage()): LocalDraft<T> | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const envelope = Envelope.safeParse(JSON.parse(raw));
    if (!envelope.success) return null;
    const value = schema.safeParse(envelope.data.value);
    return value.success ? { savedAt: envelope.data.savedAt, value: value.data } : null;
  } catch {
    return null;
  }
}

/** Ghi bản lưu trên máy; bị chặn hoặc hết chỗ thì bỏ qua và trả false. */
export function writeLocalDraft<T>(key: string, value: T, now = new Date(), storage: DraftStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ savedAt: now.toISOString(), value }));
    return true;
  } catch {
    return false;
  }
}

export function removeLocalDraft(key: string, storage: DraftStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Bị chặn thì cũng không có gì để xoá.
  }
}
