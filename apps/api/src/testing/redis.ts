import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

// Chỉ dùng trong test, không nằm trong build. Local: `pnpm infra:up`; CI: service container redis.
const TEST_URL = process.env.REDIS_TEST_URL ?? 'redis://localhost:6379';

/** Kết nối Redis với tiền tố khoá ngẫu nhiên, để các file test chạy song song không đụng nhau. */
export async function connectTestRedis(): Promise<Redis> {
  const redis = new Redis(TEST_URL, {
    keyPrefix: `test:${randomUUID().slice(0, 8)}:`,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await redis.connect();
  } catch (err) {
    throw new Error(`Không kết nối được Redis test tại ${TEST_URL}. Chạy \`pnpm infra:up\` trước.`, { cause: err });
  }
  return redis;
}

/** Liệt kê khoá của kết nối theo mẫu (ví dụ 'sess:*'), đã bỏ tiền tố. KEYS chỉ dùng trong test. */
export async function testKeys(redis: Redis, pattern = '*'): Promise<string[]> {
  const prefix = redis.options.keyPrefix ?? '';
  // ioredis không thêm keyPrefix vào mẫu của KEYS và không bỏ tiền tố trong kết quả.
  return (await redis.keys(`${prefix}${pattern}`)).map((k) => k.slice(prefix.length)).sort();
}

/** Xoá mọi khoá của kết nối test rồi đóng kết nối. */
export async function dropTestRedis(redis: Redis): Promise<void> {
  if (redis.status === 'end') return;
  const keys = await testKeys(redis);
  if (keys.length > 0) await redis.del(...keys);
  // quit() xong khi Redis trả OK, lúc socket chưa đóng; chờ 'end' để chắc kết nối đã đóng hẳn.
  const ended = new Promise<void>((resolve) => redis.once('end', resolve));
  await redis.quit();
  await ended;
}
