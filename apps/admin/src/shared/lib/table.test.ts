import { describe, expect, it } from 'vitest';
import { ariaSort, columnClass, toggleSort } from './table';

describe('toggleSort', () => {
  it('cột mới bắt đầu bằng chiều đầu của cột, bấm lại thì đảo chiều', () => {
    expect(toggleSort(null, { key: 'name' })).toEqual({ key: 'name', dir: 'asc' });
    expect(toggleSort({ key: 'name', dir: 'asc' }, { key: 'name' })).toEqual({ key: 'name', dir: 'desc' });
    expect(toggleSort({ key: 'name', dir: 'desc' }, { key: 'updated', firstDir: 'desc' })).toEqual({ key: 'updated', dir: 'desc' });
    expect(toggleSort({ key: 'updated', dir: 'desc' }, { key: 'updated', firstDir: 'desc' })).toEqual({ key: 'updated', dir: 'asc' });
  });
});

describe('ariaSort, columnClass', () => {
  it('chỉ cột đang xếp có chiều', () => {
    expect(ariaSort({ key: 'name', dir: 'asc' }, 'name')).toBe('ascending');
    expect(ariaSort({ key: 'name', dir: 'desc' }, 'name')).toBe('descending');
    expect(ariaSort({ key: 'name', dir: 'asc' }, 'verified')).toBe('none');
    expect(ariaSort(null, 'name')).toBe('none');
  });
  it('cột ẩn dưới 1024px có class riêng', () => {
    expect(columnClass({ hideBelow: 1024 })).toBe('rd-admin-col--from-1024');
    expect(columnClass({})).toBeUndefined();
  });
});
