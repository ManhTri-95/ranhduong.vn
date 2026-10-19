import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { chunkFailedTarget, installChunkRecovery } from './chunk-recovery';

function routerFailingWith(error: Error) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/bao-cao', component: () => Promise.reject(error) },
    ],
  });
}
function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}
const CHUNK_ERROR = new TypeError('Failed to fetch dynamically imported module: http://admin.gia-lap.example/assets/MetricsPage-a1.js');

afterEach(() => {
  chunkFailedTarget.value = null;
});

describe('installChunkRecovery', () => {
  it('lỗi điều hướng khác vẫn được ghi ra console, không tải lại', async () => {
    const router = routerFailingWith(new Error('Hỏng khi kiểm phiên'));
    const reload = vi.fn();
    const report = vi.fn();
    installChunkRecovery(router, { storage: memoryStorage, reload, report });
    await router.push('/bao-cao').catch(() => undefined);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hỏng khi kiểm phiên' }));
    expect(reload).not.toHaveBeenCalled();
    expect(chunkFailedTarget.value).toBeNull();
  });

  it('chunk lỗi lần đầu thì tải lại toàn trang tới trang đích', async () => {
    const router = routerFailingWith(CHUNK_ERROR);
    const reload = vi.fn();
    installChunkRecovery(router, { storage: memoryStorage, reload, report: vi.fn() });
    await router.push('/bao-cao').catch(() => undefined);
    expect(reload).toHaveBeenCalledWith('/bao-cao');
  });

  it('không tải lại được thì báo trang lỗi; điều hướng thành công sau đó thì ẩn thông báo', async () => {
    const router = routerFailingWith(CHUNK_ERROR);
    const reload = vi.fn();
    installChunkRecovery(router, { storage: () => null, reload, report: vi.fn() });
    await router.push('/bao-cao').catch(() => undefined);
    expect(reload).not.toHaveBeenCalled();
    expect(chunkFailedTarget.value).toBe('/bao-cao');
    await router.push('/');
    expect(chunkFailedTarget.value).toBeNull();
  });
});
