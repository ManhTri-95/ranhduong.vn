import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { AdminTemplateLock, TEMPLATE_WRITE_LOCK_KEY } from './admin-template-lock';
describe('S15 distributed template write lock', () => {
  let redis: Redis;
  beforeAll(async () => { redis = await connectTestRedis(); });
  afterAll(async () => { await dropTestRedis(redis); });
  it('serializes separate lock instances and releases after action failure', async () => {
    const first = new AdminTemplateLock(redis); const second = new AdminTemplateLock(redis);
    const order: number[] = [];
    await Promise.all([
      first.run(async (assertOwned) => { order.push(1); await new Promise((resolve) => setTimeout(resolve, 100)); await assertOwned(); order.push(2); }),
      second.run(async (assertOwned) => { await assertOwned(); order.push(3); }),
    ]);
    expect(order).toEqual([1, 2, 3]);
    await expect(first.run(async () => { throw new Error('Giả Lập'); })).rejects.toThrow('Giả Lập');
    expect(await redis.get(TEMPLATE_WRITE_LOCK_KEY)).toBeNull();
  });
  it('fails closed when ownership is lost and never releases another owner', async () => {
    const lock = new AdminTemplateLock(redis);
    await expect(lock.run(async (assertOwned) => {
      await redis.set(TEMPLATE_WRITE_LOCK_KEY, 'other-owner', 'PX', 30000);
      await assertOwned();
      throw new Error('Must not reach protected write');
    })).rejects.toMatchObject({ body: { code: 'CONFLICT' } });
    expect(await redis.get(TEMPLATE_WRITE_LOCK_KEY)).toBe('other-owner');
    await redis.del(TEMPLATE_WRITE_LOCK_KEY);
  });
  it('renews a near-expiry lease before permitting the protected write', async () => {
    await new AdminTemplateLock(redis).run(async (assertOwned) => {
      await redis.pexpire(TEMPLATE_WRITE_LOCK_KEY, 500);
      await assertOwned();
      expect(await redis.pttl(TEMPLATE_WRITE_LOCK_KEY)).toBeGreaterThan(100_000);
    });
  });
});
