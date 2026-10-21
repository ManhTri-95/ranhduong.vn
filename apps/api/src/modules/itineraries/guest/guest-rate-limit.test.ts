import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Redis } from 'ioredis';
import { connectTestRedis, dropTestRedis, testKeys } from '../../../testing/redis';
import { GuestRateLimit } from './guest-rate-limit';

describe('S37 atomic sliding creation limits', () => {
  let redis: Redis;
  let limiter: GuestRateLimit;
  beforeAll(async () => { redis = await connectTestRedis(); limiter = new GuestRateLimit(redis); });
  afterAll(async () => { await dropTestRedis(redis); });

  it('allows exactly 10 concurrent requests per guest and releases each after an hour', async () => {
    const start = Date.parse('2026-10-21T16:59:59Z');
    const results = await Promise.allSettled(Array.from({ length: 15 }, () => limiter.check('guest-a', '192.0.2.1', start)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(5);
    await expect(limiter.check('guest-a', '192.0.2.2', start + 3599999)).rejects.toMatchObject({ body: { code: 'RATE_LIMITED' } });
    await expect(limiter.check('guest-a', '192.0.2.2', start + 3600000)).resolves.toBeUndefined();
  });

  it('limits rotating guests to 60 per IP without charging the rejected guest', async () => {
    const start = Date.now();
    for (let i = 0; i < 60; i++) await limiter.check(`rotating-${i}`, '192.0.2.3', start + i);
    await expect(limiter.check('rejected', '192.0.2.3', start + 3599999)).rejects.toMatchObject({ body: { code: 'RATE_LIMITED' } });
    for (let i = 0; i < 10; i++) await limiter.check('rejected', '192.0.2.4', start + 3599999);
    await expect(limiter.check('new', '192.0.2.3', start + 3600000)).resolves.toBeUndefined();
    await expect(limiter.check('new', '192.0.2.3', start + 3600000)).rejects.toMatchObject({ body: { code: 'RATE_LIMITED' } });
    expect((await testKeys(redis, 'itin:*')).join(' ')).not.toMatch(/192\.0\.2|rotating|rejected|guest-a/);
  });
});
