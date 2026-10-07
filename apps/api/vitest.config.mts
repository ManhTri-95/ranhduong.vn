import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Không cần setupFiles cho reflect-metadata: @nestjs/common tự import gói này.
    // Test tích hợp chạy với MongoDB thật; tạo index mất vài trăm ms.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
