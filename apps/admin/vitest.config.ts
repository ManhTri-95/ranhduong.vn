import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Chỉ test hàm thuần (lib, model, shared/lib); component kiểm bằng typecheck và trình duyệt.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
