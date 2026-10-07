import { defineConfig } from 'vitest/config';

// Chỉ test hàm thuần trong app/**/lib (không dùng auto-import của Nuxt). Component kiểm bằng typecheck và trình duyệt.
export default defineConfig({
  test: { include: ['app/**/*.test.ts'] },
});
