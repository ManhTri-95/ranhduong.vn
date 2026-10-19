import { describe, expect, it } from 'vitest';
import { CHUNK_RELOAD_KEY, claimChunkReload, isChunkLoadError } from './chunk-reload';

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(CHUNK_RELOAD_KEY, initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('isChunkLoadError', () => {
  it('nhận lỗi tải module động của Chrome, Firefox, Safari và lỗi preload CSS của Vite', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://admin.ranhduong.vn/assets/PlacesPage-a1.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: https://admin.ranhduong.vn/assets/PlacesPage-a1.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/x.css'))).toBe(true);
  });

  it('lỗi khác hoặc không phải Error thì không tính', () => {
    expect(isChunkLoadError(new Error('Network error'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });
});

describe('claimChunkReload', () => {
  it('lần đầu được tải lại và ghi lại trang đích cùng thời điểm', () => {
    const storage = memoryStorage();
    expect(claimChunkReload('/bao-cao', storage, 1000)).toBe(true);
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe('{"target":"/bao-cao","at":1000}');
  });

  it('cùng trang trong 10 giây thì không tải lại nữa; quá 10 giây hoặc trang khác thì được', () => {
    const saved = '{"target":"/bao-cao","at":1000}';
    expect(claimChunkReload('/bao-cao', memoryStorage(saved), 10_999)).toBe(false);
    expect(claimChunkReload('/bao-cao', memoryStorage(saved), 11_000)).toBe(true);
    expect(claimChunkReload('/mua', memoryStorage(saved), 2000)).toBe(true);
  });

  it('giá trị lưu hỏng coi như chưa tải lại', () => {
    expect(claimChunkReload('/bao-cao', memoryStorage('{'), 1000)).toBe(true);
  });

  it('không có chỗ ghi thì không tải lại, tránh lặp vô hạn', () => {
    expect(claimChunkReload('/bao-cao', null, 1000)).toBe(false);
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    };
    expect(claimChunkReload('/bao-cao', blocked, 1000)).toBe(false);
  });
});
