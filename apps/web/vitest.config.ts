import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Chỉ test hàm thuần trong app/**/lib (không dùng auto-import của Nuxt). Component kiểm bằng typecheck và trình duyệt.
// Alias `~` trỏ vào app/ giống Nuxt 4, để lib ở lớp trên import được lib ở lớp dưới.
export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  test: { include: ['app/**/*.test.ts'] },
});
