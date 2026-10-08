import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readLocalDraft, removeLocalDraft, writeLocalDraft, type DraftStorage } from './local-draft';

function memoryStorage(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}
const Value = z.object({ name: z.string() });
const NOW = new Date('2026-10-08T07:32:00Z');

describe('local-draft', () => {
  it('ghi rồi đọc lại đúng giá trị và thời điểm lưu; xoá thì hết', () => {
    const storage = memoryStorage();
    expect(writeLocalDraft('k', { name: 'Quán Giả Lập' }, NOW, storage)).toBe(true);
    expect(readLocalDraft('k', Value, storage)).toEqual({ savedAt: '2026-10-08T07:32:00.000Z', value: { name: 'Quán Giả Lập' } });
    removeLocalDraft('k', storage);
    expect(readLocalDraft('k', Value, storage)).toBeNull();
  });
  it('bản lưu hỏng, sai dạng hoặc thiếu thời điểm thì coi như không có', () => {
    const storage = memoryStorage();
    storage.data.set('hong', '{không phải json');
    storage.data.set('sai-dang', JSON.stringify({ savedAt: '2026-10-08T07:32:00.000Z', value: { name: 1 } }));
    storage.data.set('thieu-thoi-diem', JSON.stringify({ value: { name: 'Quán Giả Lập' } }));
    for (const key of ['hong', 'sai-dang', 'thieu-thoi-diem', 'khong-co']) {
      expect(readLocalDraft(key, Value, storage), key).toBeNull();
    }
  });
  it('trình duyệt chặn hoặc hết chỗ thì không ném lỗi', () => {
    const fail = () => {
      throw new Error('Lỗi lưu trữ giả lập');
    };
    const blocked: DraftStorage = { getItem: fail, setItem: fail, removeItem: fail };
    expect(writeLocalDraft('k', { name: 'Quán Giả Lập' }, NOW, blocked)).toBe(false);
    expect(readLocalDraft('k', Value, blocked)).toBeNull();
    expect(() => removeLocalDraft('k', blocked)).not.toThrow();
  });
  it('không có localStorage thì bỏ qua', () => {
    expect(writeLocalDraft('k', { name: 'Quán Giả Lập' }, NOW, null)).toBe(false);
    expect(readLocalDraft('k', Value, null)).toBeNull();
  });
});
