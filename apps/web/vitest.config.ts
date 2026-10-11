import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Test lib và plugin với Nuxt auto-import được mock. Component kiểm bằng typecheck và trình duyệt.
// Alias `~` trỏ vào app/ giống Nuxt 4, để lib ở lớp trên import được lib ở lớp dưới.
export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  test: { include: ['app/**/*.test.ts'] },
});
