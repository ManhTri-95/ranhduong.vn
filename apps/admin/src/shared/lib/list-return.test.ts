import { describe, expect, it } from 'vitest';
import { listReturnLocation, plainQuery, readListReturn, sameQuery, saveListReturn, scrollToRestore, type ReturnStorage } from './list-return';

function memoryStorage(): ReturnStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('list-return', () => {
  it('lưu rồi đọc lại query và vị trí cuộn', () => {
    const storage = memoryStorage();
    saveListReturn('places', { query: { status: 'draft', q: 'giả lập' }, scrollY: 640 }, storage);
    expect(readListReturn('places', storage)).toEqual({ query: { status: 'draft', q: 'giả lập' }, scrollY: 640 });
    expect(listReturnLocation('places', storage)).toEqual({ path: '/dia-diem', query: { status: 'draft', q: 'giả lập' } });
  });
  it('chưa lưu, JSON hỏng hoặc sai dạng thì coi như không có', () => {
    const storage = memoryStorage();
    expect(listReturnLocation('templates', storage)).toEqual({ path: '/lich-trinh', query: {} });
    storage.data.set('rd-admin:list-return:places', '{hỏng');
    expect(readListReturn('places', storage)).toBeNull();
    storage.data.set('rd-admin:list-return:places', JSON.stringify({ query: { status: 1 }, scrollY: -5 }));
    expect(readListReturn('places', storage)).toBeNull();
  });
  it('trình duyệt chặn bộ nhớ thì không ném lỗi', () => {
    const fail = () => {
      throw new Error('Bộ nhớ bị chặn giả lập');
    };
    const blocked: ReturnStorage = { getItem: fail, setItem: fail };
    expect(() => saveListReturn('places', { query: {}, scrollY: 10 }, blocked)).not.toThrow();
    expect(readListReturn('places', blocked)).toBeNull();
    expect(listReturnLocation('places', null)).toEqual({ path: '/dia-diem', query: {} });
  });
  it('chỉ cuộn lại khi đang xem đúng bộ lọc đã lưu', () => {
    const entry = { query: { status: 'draft' }, scrollY: 640 };
    expect(scrollToRestore(entry, { status: 'draft' })).toBe(640);
    expect(scrollToRestore(entry, { status: 'active' })).toBeNull();
    expect(scrollToRestore({ query: {}, scrollY: 0 }, {})).toBeNull();
    expect(scrollToRestore(null, {})).toBeNull();
  });
  it('plainQuery giữ chuỗi đầu tiên, bỏ null; sameQuery không phụ thuộc thứ tự khoá', () => {
    expect(plainQuery({ status: ['draft', 'active'], q: 'giả', zone: null })).toEqual({ status: 'draft', q: 'giả' });
    expect(sameQuery({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
    expect(sameQuery({ a: '1' }, { a: '1', b: '2' })).toBe(false);
  });
});
