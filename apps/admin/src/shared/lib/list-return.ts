import { z } from 'zod';

/** Phần Storage dùng tới; test truyền bản giả. */
export type ReturnStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** Danh sách có link quay lại (breadcrumb, thanh bên). */
export type ListKey = 'places' | 'templates';

const LIST_PATH: Record<ListKey, string> = { places: '/dia-diem', templates: '/lich-trinh' };
const ListReturn = z.object({ query: z.record(z.string(), z.string()), scrollY: z.number().int().min(0) });
export type ListReturn = z.infer<typeof ListReturn>;
const storageKey = (list: ListKey) => `rd-admin:list-return:${list}`;

/** sessionStorage theo từng tab; bị chặn thì null. */
function sessionStore(): ReturnStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Query của vue-router → chỉ giữ chuỗi đầu tiên của mỗi khoá. */
export function plainQuery(query: Readonly<Record<string, unknown>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    const first: unknown = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') result[key] = first;
  }
  return result;
}

export function sameQuery(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

export function saveListReturn(list: ListKey, entry: ListReturn, storage: ReturnStorage | null = sessionStore()): void {
  try {
    storage?.setItem(storageKey(list), JSON.stringify(entry));
  } catch {
    // Bị chặn hoặc hết chỗ thì thôi nhớ; quay lại sẽ là danh sách mặc định.
  }
}

/** Đọc bộ lọc đã nhớ; không có, hỏng hoặc sai dạng thì null. */
export function readListReturn(list: ListKey, storage: ReturnStorage | null = sessionStore()): ListReturn | null {
  try {
    const raw = storage?.getItem(storageKey(list));
    if (!raw) return null;
    const parsed = ListReturn.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Link quay lại danh sách với bộ lọc lần trước (breadcrumb, thanh bên). */
export function listReturnLocation(list: ListKey, storage: ReturnStorage | null = sessionStore()): { path: string; query: Record<string, string> } {
  return { path: LIST_PATH[list], query: readListReturn(list, storage)?.query ?? {} };
}

/** Vị trí cuộn cần trả lại: chỉ khi đang xem đúng bộ lọc đã lưu và đã cuộn xuống. */
export function scrollToRestore(entry: ListReturn | null, query: Readonly<Record<string, string>>): number | null {
  if (!entry || entry.scrollY === 0 || !sameQuery(entry.query, query)) return null;
  return entry.scrollY;
}
