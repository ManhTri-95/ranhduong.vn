import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastStore } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createToastStore', () => {
  it('tự ẩn sau 4 giây', () => {
    const toast = createToastStore();
    toast.show('Đã lưu Giả Lập.');
    vi.advanceTimersByTime(3999);
    expect(toast.current.value?.message).toBe('Đã lưu Giả Lập.');
    vi.advanceTimersByTime(1);
    expect(toast.current.value).toBeNull();
  });
  it('rê chuột hoặc focus thì dừng đếm, rời ra thì đếm lại đủ 4 giây', () => {
    const toast = createToastStore();
    toast.show('Đã lưu Giả Lập.');
    toast.pause();
    vi.advanceTimersByTime(10_000);
    expect(toast.current.value).not.toBeNull();
    toast.resume();
    vi.advanceTimersByTime(3999);
    expect(toast.current.value).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toast.current.value).toBeNull();
  });
  it('thông báo mới thay thông báo cũ và đếm lại; đóng tay thì ẩn ngay', () => {
    const toast = createToastStore();
    toast.show('Cũ Giả Lập');
    vi.advanceTimersByTime(3000);
    toast.show('Mới Giả Lập');
    vi.advanceTimersByTime(3000);
    expect(toast.current.value?.message).toBe('Mới Giả Lập');
    toast.dismiss();
    expect(toast.current.value).toBeNull();
  });
});

describe('S28 review: đóng tay khi đang rê chuột', () => {
  it('đóng bằng × lúc đang dừng đếm thì thông báo sau vẫn tự ẩn', () => {
    const toast = createToastStore();
    toast.show('Cũ Giả Lập');
    toast.pause();
    toast.dismiss();
    toast.show('Mới Giả Lập');
    vi.advanceTimersByTime(4000);
    expect(toast.current.value).toBeNull();
  });
});
