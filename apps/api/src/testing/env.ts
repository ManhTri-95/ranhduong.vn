import { type Env, loadEnv } from '../config/env';

/** Env giả cho test, đi qua đúng loadEnv để giống lúc chạy thật. Chỉ dùng trong test. */
export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    MONGODB_URI: 'mongodb://localhost:27017/gia-lap',
    GOOGLE_CLIENT_ID: 'client-id-gia-lap.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'client-secret-gia-lap',
    ADMIN_EMAILS: 'quan-tri-gia-lap@example.com',
    ADMIN_URL: 'http://admin.gia-lap.example',
    ...overrides,
  });
}
