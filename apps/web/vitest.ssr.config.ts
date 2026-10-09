import { defineConfig } from 'vitest/config';

// Chạy sau build để kiểm hành vi HTTP của bản Nuxt production, riêng với test hàm thuần trong app/.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], hookTimeout: 30_000, testTimeout: 15_000 },
});
