import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis, testKeys } from './redis';

describe('helper Redis cho test', () => {
  let a: Redis;
  let b: Redis;
  beforeAll(async () => {
    a = await connectTestRedis();
    b = await connectTestRedis();
  });
  afterAll(async () => {
    await dropTestRedis(a);
    await dropTestRedis(b);
  });

  it('mỗi kết nối có tiền tố riêng nên không thấy khoá của nhau', async () => {
    await a.set('sess:gia-lap', '1');
    expect(await testKeys(a, 'sess:*')).toEqual(['sess:gia-lap']);
    expect(await testKeys(b)).toEqual([]);
    expect(await b.get('sess:gia-lap')).toBeNull();
  });

  it('dropTestRedis xoá mọi khoá của kết nối và đóng kết nối', async () => {
    const c = await connectTestRedis();
    await c.set('oauth:gia-lap', '1');
    const prefix = c.options.keyPrefix ?? '';
    await dropTestRedis(c);
    expect(c.status).toBe('end');
    const raw = new Redis(process.env.REDIS_TEST_URL ?? 'redis://localhost:6379');
    try {
      expect(await raw.exists(`${prefix}oauth:gia-lap`)).toBe(0);
    } finally {
      await raw.quit();
    }
  });
});
